import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./services/api";
import { Icon } from "./KelolaData";
import "./KelolaData.css";

// Tab di halaman ini dan tab Kelola Data berbagi satu bar navigasi
const tabs = ["Kategori", "Barang", "Pertanyaan", "Aturan", "Faktor Dampak"];
const ownTabs = ["Aturan", "Faktor Dampak"];

const MENU_BY_TAB = {
  Kategori: "kategori",
  Barang: "barang",
  Pertanyaan: "pertanyaan",
  Aturan: "aturan",
  "Faktor Dampak": "faktor",
};

const TAB_BY_MENU = {
  aturan: "Aturan",
  faktor: "Faktor Dampak",
};

const TINDAKAN = [
  { value: "gunakan_kembali", label: "Gunakan Kembali" },
  { value: "perbaiki", label: "Perbaiki" },
  { value: "jual", label: "Jual" },
  { value: "donasikan", label: "Donasikan" },
  { value: "daur_ulang", label: "Daur Ulang" },
];

const NILAI_FUNGSI = [
  { value: "berfungsi_penuh", label: "Berfungsi penuh" },
  { value: "berfungsi_sebagian", label: "Berfungsi sebagian" },
  { value: "tidak_berfungsi", label: "Tidak berfungsi" },
];

// jenis: cara syarat diisi di form (sesuai format yang diterima rule engine BE)
const KOLOM_KONDISI = {
  fungsiUtama: { label: "Fungsi utama", jenis: "fungsi" },
  kondisiFisik: { label: "Kondisi fisik", jenis: "daftar" },
  usiaTahun: { label: "Usia (tahun)", jenis: "rentang" },
  kelengkapan: { label: "Kelengkapan (%)", jenis: "rentang" },
  mengandungBahaya: { label: "Mengandung bahaya", jenis: "boolean" },
  jenisBahaya: { label: "Jenis bahaya", jenis: "daftar" },
};

const SATUAN_FAKTOR = "kgCO2e/kg";
const PAGE_SIZE = 4;

const labelTindakan = (value) =>
  TINDAKAN.find((item) => item.value === value)?.label || value;

const formatAngka = (nilai) =>
  Number(nilai).toLocaleString("id-ID", { maximumFractionDigits: 6 });

function barisBaru(kolom) {
  return {
    kolom,
    fungsi: [],
    tidakTahu: false,
    teks: "",
    min: "",
    max: "",
    boolean: "true",
  };
}

// Objek kondisi dari BE -> baris yang bisa diedit di form
function kondisiKeBaris(kondisi) {
  return Object.entries(kondisi || {})
    .filter(([kolom]) => KOLOM_KONDISI[kolom])
    .map(([kolom, syarat]) => {
      const baris = barisBaru(kolom);
      const { jenis } = KOLOM_KONDISI[kolom];

      if (jenis === "boolean") {
        baris.boolean = String(syarat);
      } else if (syarat === null) {
        baris.tidakTahu = true;
      } else if (jenis === "fungsi") {
        baris.fungsi = [].concat(syarat);
      } else if (jenis === "daftar") {
        baris.teks = [].concat(syarat).join(", ");
      } else if (typeof syarat === "number") {
        baris.min = String(syarat);
        baris.max = String(syarat);
      } else {
        baris.min = syarat.min ?? "";
        baris.max = syarat.max ?? "";
      }

      return baris;
    });
}

// Baris form -> objek kondisi untuk BE. Mengembalikan { kondisi } atau { error }
function barisKeKondisi(daftarBaris) {
  const kondisi = {};

  for (const baris of daftarBaris) {
    const { label, jenis } = KOLOM_KONDISI[baris.kolom];

    if (jenis === "boolean") {
      kondisi[baris.kolom] = baris.boolean === "null" ? null : baris.boolean === "true";
    } else if (jenis === "daftar") {
      const daftar = baris.teks.split(",").map((item) => item.trim()).filter(Boolean);
      if (daftar.length === 0) return { error: `Isi nilai untuk syarat "${label}".` };
      kondisi[baris.kolom] = daftar.length === 1 ? daftar[0] : daftar;
    } else if (baris.tidakTahu) {
      kondisi[baris.kolom] = null;
    } else if (jenis === "fungsi") {
      if (baris.fungsi.length === 0) return { error: `Pilih minimal satu nilai untuk "${label}".` };
      kondisi[baris.kolom] = baris.fungsi.length === 1 ? baris.fungsi[0] : baris.fungsi;
    } else {
      const min = String(baris.min).trim();
      const max = String(baris.max).trim();
      if (min === "" && max === "") return { error: `Isi nilai minimal atau maksimal untuk "${label}".` };
      if ((min !== "" && !Number.isFinite(Number(min))) || (max !== "" && !Number.isFinite(Number(max)))) {
        return { error: `Nilai "${label}" harus berupa angka.` };
      }
      if (min !== "" && max !== "" && Number(min) > Number(max)) {
        return { error: `Nilai minimal "${label}" tidak boleh lebih besar dari maksimal.` };
      }
      if (min !== "" && min === max) {
        kondisi[baris.kolom] = Number(min);
      } else {
        kondisi[baris.kolom] = {
          ...(min !== "" && { min: Number(min) }),
          ...(max !== "" && { max: Number(max) }),
        };
      }
    }
  }

  return { kondisi };
}

function formatSyarat(syarat) {
  if (syarat === null) return "Tidak tahu";
  if (typeof syarat === "boolean") return syarat ? "Ya" : "Tidak";
  if (Array.isArray(syarat)) return syarat.map((item) => String(item).replace(/_/g, " ")).join(", ");
  if (typeof syarat === "object") {
    const { min, max } = syarat;
    if (min !== undefined && max !== undefined) return `${min} – ${max}`;
    return min !== undefined ? `≥ ${min}` : `≤ ${max}`;
  }
  return String(syarat).replace(/_/g, " ");
}

function ringkasKondisi(kondisi) {
  const entri = Object.entries(kondisi || {});
  if (entri.length === 0) return "Selalu berlaku";

  return entri
    .map(([kolom, syarat]) => `${KOLOM_KONDISI[kolom]?.label || kolom}: ${formatSyarat(syarat)}`)
    .join(" · ");
}

function bentukFormAturan(item) {
  return {
    kode: item?.kode || "",
    namaAturan: item?.namaAturan || "",
    kategoriId: item?.kategoriId ? String(item.kategoriId) : "",
    tindakan: item?.tindakan || "gunakan_kembali",
    bobot: item?.bobot ?? 0,
    eliminasi: item?.eliminasi ?? false,
    alasan: item?.alasan || "",
    status: item?.status || "Aktif",
  };
}

function bentukFormFaktor(item, materialAwal) {
  return {
    kode: item?.kode || "",
    material: item?.material || materialAwal || "",
    tindakan: item?.tindakan || "gunakan_kembali",
    nilai: item?.nilai ?? "",
    satuan: item?.satuan || SATUAN_FAKTOR,
    sumber: item?.sumber || "",
    tahun: item?.tahun ?? new Date().getFullYear(),
    status: item?.status || "Aktif",
  };
}

export default function KelolaAnalisis({ initialTab }) {
  const [activeTab, setActiveTab] = useState(
    ownTabs.includes(initialTab) ? initialTab : "Aturan"
  );

  const [categories, setCategories] = useState([]);
  const [aturan, setAturan] = useState([]);
  const [faktor, setFaktor] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [formAturan, setFormAturan] = useState(bentukFormAturan());
  const [formFaktor, setFormFaktor] = useState(bentukFormFaktor());
  const [barisKondisi, setBarisKondisi] = useState([]);

  const isAturan = activeTab === "Aturan";

  async function loadData() {
    setLoadingData(true);
    try {
      const [kategoriRes, aturanRes, faktorRes] = await Promise.all([
        apiRequest("/admin/kategori"),
        apiRequest("/admin/aturan"),
        apiRequest("/admin/faktor-dampak"),
      ]);

      const labelStatus = (status) => (status === "aktif" ? "Aktif" : "Nonaktif");

      setCategories(kategoriRes.data || []);
      setAturan(
        (aturanRes.data || []).map((item) => ({
          ...item,
          code: item.kode,
          title: item.namaAturan,
          category: item.kategori?.nama || "Semua kategori",
          description: item.alasan,
          status: labelStatus(item.status),
        }))
      );
      setFaktor(
        (faktorRes.data || []).map((item) => ({
          ...item,
          code: item.kode,
          title: `${item.material} — ${labelTindakan(item.tindakan)}`,
          category: item.material,
          description: `${formatAngka(item.nilai)} ${item.satuan} · ${item.sumber} (${item.tahun})`,
          status: labelStatus(item.status),
        }))
      );
    } catch (err) {
      setMessage(err.message || "Gagal mengambil data admin. Pastikan login sebagai admin dan backend aktif.");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (ownTabs.includes(initialTab)) changeTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    function handleMenuChange(event) {
      const tab = TAB_BY_MENU[event.detail?.menu];
      if (tab) changeTab(tab);
    }

    window.addEventListener("admin-menu-change", handleMenuChange);
    return () => window.removeEventListener("admin-menu-change", handleMenuChange);
  }, []);

  const sourceData = isAturan ? aturan : faktor;

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sourceData.filter((item) => {
      const searchable = [
        item.code,
        item.title,
        item.category,
        item.description,
        isAturan ? ringkasKondisi(item.kondisi) : "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchable.includes(keyword) &&
        (statusFilter === "Semua Status" || item.status === statusFilter)
      );
    });
  }, [sourceData, search, statusFilter, isAturan]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function changeTab(tab) {
    setActiveTab(tab);
    setSearch("");
    setStatusFilter("Semua Status");
    setCurrentPage(1);
    setShowForm(false);
    setEditingId(null);
    setViewingItem(null);
    setMessage("");
  }

  function handleTabClick(tab) {
    if (ownTabs.includes(tab)) {
      changeTab(tab);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("admin-menu-change", { detail: { menu: MENU_BY_TAB[tab] } })
    );
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setBarisKondisi([]);
  }

  function openAddForm() {
    setEditingId(null);
    setViewingItem(null);
    setFormAturan(bentukFormAturan());
    setFormFaktor(bentukFormFaktor(null, categories[0]?.nama));
    setBarisKondisi([]);
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setViewingItem(null);

    if (isAturan) {
      setFormAturan(bentukFormAturan(item));
      setBarisKondisi(kondisiKeBaris(item.kondisi));
    } else {
      setFormFaktor(bentukFormFaktor(item));
    }

    setMessage("");
    setShowForm(true);
  }

  function ubahBaris(index, perubahan) {
    setBarisKondisi((lama) =>
      lama.map((baris, i) => (i === index ? { ...baris, ...perubahan } : baris))
    );
  }

  function tambahBaris() {
    const dipakai = barisKondisi.map((baris) => baris.kolom);
    const kolom = Object.keys(KOLOM_KONDISI).find((item) => !dipakai.includes(item));
    if (kolom) setBarisKondisi((lama) => [...lama, barisBaru(kolom)]);
  }

  function gantiKolom(index, kolom) {
    setBarisKondisi((lama) =>
      lama.map((baris, i) => (i === index ? barisBaru(kolom) : baris))
    );
  }

  function toggleFungsi(index, nilai) {
    const baris = barisKondisi[index];
    const fungsi = baris.fungsi.includes(nilai)
      ? baris.fungsi.filter((item) => item !== nilai)
      : [...baris.fungsi, nilai];
    ubahBaris(index, { fungsi });
  }

  function buatPayloadAturan() {
    const kode = formAturan.kode.trim().toUpperCase();
    const bobot = Number(formAturan.bobot);

    if (editingId === null && !/^[A-Z0-9_-]{1,30}$/.test(kode)) {
      return { error: 'Kode wajib diisi: huruf, angka, "-" atau "_" (maks. 30 karakter), misalnya ELK-03-DU.' };
    }
    if (!formAturan.namaAturan.trim()) return { error: "Nama aturan wajib diisi." };
    if (!formAturan.alasan.trim()) return { error: "Alasan wajib diisi." };
    if (!Number.isInteger(bobot) || bobot < -100 || bobot > 100) {
      return { error: "Bobot harus angka bulat antara -100 dan 100." };
    }

    const { kondisi, error } = barisKeKondisi(barisKondisi);
    if (error) return { error };

    const payload = {
      namaAturan: formAturan.namaAturan.trim(),
      kategoriId: formAturan.kategoriId ? Number(formAturan.kategoriId) : null,
      kondisi,
      tindakan: formAturan.tindakan,
      bobot,
      eliminasi: Boolean(formAturan.eliminasi),
      alasan: formAturan.alasan.trim(),
      status: formAturan.status === "Aktif" ? "aktif" : "nonaktif",
    };
    if (editingId === null) payload.kode = kode;

    return { payload };
  }

  function buatPayloadFaktor() {
    const kode = formFaktor.kode.trim().toUpperCase();
    const nilai = Number(formFaktor.nilai);
    const tahun = Number(formFaktor.tahun);
    const tahunIni = new Date().getFullYear();

    if (editingId === null && !/^[A-Z0-9_-]{1,30}$/.test(kode)) {
      return { error: 'Kode wajib diisi: huruf, angka, "-" atau "_" (maks. 30 karakter), misalnya PLS-DU.' };
    }
    if (!categories.some((item) => item.nama === formFaktor.material)) {
      return { error: "Pilih material yang valid terlebih dahulu." };
    }
    if (formFaktor.nilai === "" || !Number.isFinite(nilai)) return { error: "Nilai faktor harus berupa angka." };
    if (!formFaktor.satuan.trim()) return { error: "Satuan wajib diisi." };
    if (!formFaktor.sumber.trim()) return { error: "Sumber data wajib diisi." };
    if (!Number.isInteger(tahun) || tahun < 1990 || tahun > tahunIni) {
      return { error: `Tahun harus antara 1990 dan ${tahunIni}.` };
    }

    const payload = {
      material: formFaktor.material,
      tindakan: formFaktor.tindakan,
      nilai,
      satuan: formFaktor.satuan.trim(),
      sumber: formFaktor.sumber.trim(),
      tahun,
      status: formFaktor.status === "Aktif" ? "aktif" : "nonaktif",
    };
    if (editingId === null) payload.kode = kode;

    return { payload };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const { payload, error } = isAturan ? buatPayloadAturan() : buatPayloadFaktor();
    if (error) {
      setMessage(error);
      return;
    }

    const endpoint = isAturan ? "/admin/aturan" : "/admin/faktor-dampak";

    setSaving(true);
    try {
      const response = await apiRequest(
        editingId !== null ? `${endpoint}/${editingId}` : endpoint,
        {
          method: editingId !== null ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      await loadData();
      resetForm();
      setMessage(
        editingId !== null
          ? response.message || "Data berhasil diperbarui di database."
          : "Data berhasil ditambahkan ke database."
      );
    } catch (err) {
      setMessage(
        err.errors?.map((item) => item.message).join(" ") ||
          err.message ||
          "Gagal menyimpan data ke backend."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Hapus data "${item.title}"?`)) return;

    try {
      await apiRequest(`${isAturan ? "/admin/aturan" : "/admin/faktor-dampak"}/${item.id}`, {
        method: "DELETE",
      });
      await loadData();
      setViewingItem(null);
      setMessage(`${item.title} berhasil dihapus dari database.`);
    } catch (err) {
      setMessage(err.message || "Data tidak dapat dihapus. Mungkin masih digunakan oleh data lain.");
    }
  }

  function closeOverlay() {
    resetForm();
    setViewingItem(null);
  }

  function renderStatus(status) {
    const active = status === "Aktif";

    return (
      <span className={`kd-status ${active ? "active" : "inactive"}`}>
        {active ? "AKTIF" : "NON-AKTIF"}
      </span>
    );
  }

  function renderCard(item) {
    return (
      <article className="kd-card" key={item.id}>
        <div className="kd-card-top">
          <div className="kd-card-meta">
            <span className="kd-code">{item.code}</span>
            {renderStatus(item.status)}
          </div>

          <div className="kd-card-actions">
            <button
              type="button"
              className="kd-icon-button"
              title="Lihat detail"
              aria-label={`Lihat ${item.title}`}
              onClick={() => setViewingItem(item)}
            >
              <Icon name="eye" size={16} />
            </button>

            <button
              type="button"
              className="kd-icon-button"
              title="Edit data"
              aria-label={`Edit ${item.title}`}
              onClick={() => openEditForm(item)}
            >
              <Icon name="edit" size={16} />
            </button>

            <button
              type="button"
              className="kd-icon-button danger"
              title="Hapus data"
              aria-label={`Hapus ${item.title}`}
              onClick={() => handleDelete(item)}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>

        <h3 className="kd-card-title">{item.title}</h3>

        <p className="kd-card-category">
          {isAturan
            ? `Kategori: ${item.category} · ${labelTindakan(item.tindakan)} · Bobot ${item.eliminasi ? "eliminasi" : item.bobot}`
            : `Versi ${item.versi} · ${labelTindakan(item.tindakan)}`}
        </p>

        <p className="kd-card-description">{item.description}</p>
      </article>
    );
  }

  function renderDetail(item) {
    return (
      <dl className="kd-detail-list">
        {isAturan ? (
          <>
            <dt>Kategori</dt>
            <dd>{item.category}</dd>

            <dt>Tindakan</dt>
            <dd>{labelTindakan(item.tindakan)}</dd>

            <dt>Bobot</dt>
            <dd>{item.bobot}</dd>

            <dt>Eliminasi</dt>
            <dd>{item.eliminasi ? "Ya" : "Tidak"}</dd>

            <dt>Kondisi</dt>
            <dd>
              {Object.keys(item.kondisi || {}).length === 0 ? (
                "Selalu berlaku"
              ) : (
                <ul className="kd-detail-options">
                  {Object.entries(item.kondisi).map(([kolom, syarat]) => (
                    <li key={kolom}>
                      {KOLOM_KONDISI[kolom]?.label || kolom}: {formatSyarat(syarat)}
                    </li>
                  ))}
                </ul>
              )}
            </dd>

            <dt>Alasan</dt>
            <dd>{item.alasan}</dd>
          </>
        ) : (
          <>
            <dt>Material</dt>
            <dd>{item.material}</dd>

            <dt>Tindakan</dt>
            <dd>{labelTindakan(item.tindakan)}</dd>

            <dt>Nilai</dt>
            <dd>
              {formatAngka(item.nilai)} {item.satuan}
            </dd>

            <dt>Sumber</dt>
            <dd>{item.sumber}</dd>

            <dt>Tahun</dt>
            <dd>{item.tahun}</dd>
          </>
        )}

        <dt>Versi</dt>
        <dd>{item.versi}</dd>

        <dt>Diubah oleh</dt>
        <dd>{item.admin?.nama || "-"}</dd>
      </dl>
    );
  }

  function renderKondisiEditor() {
    const dipakai = barisKondisi.map((baris) => baris.kolom);
    const masihAda = Object.keys(KOLOM_KONDISI).some((item) => !dipakai.includes(item));

    return (
      <div className="kd-options-editor">
        <label>Syarat Kondisi</label>
        <p className="kd-options-hint">
          Aturan berlaku jika semua syarat terpenuhi. Kosongkan untuk aturan yang selalu berlaku.
        </p>

        {barisKondisi.map((baris, index) => {
          const { jenis } = KOLOM_KONDISI[baris.kolom];

          return (
            <div className="kd-condition-row" key={baris.kolom}>
              <div className="kd-option-row">
                <select
                  value={baris.kolom}
                  onChange={(event) => gantiKolom(index, event.target.value)}
                  aria-label={`Kolom syarat ${index + 1}`}
                >
                  {Object.entries(KOLOM_KONDISI).map(([kolom, { label }]) => (
                    <option
                      key={kolom}
                      value={kolom}
                      disabled={kolom !== baris.kolom && dipakai.includes(kolom)}
                    >
                      {label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="kd-option-remove"
                  onClick={() =>
                    setBarisKondisi((lama) => lama.filter((_, i) => i !== index))
                  }
                  aria-label={`Hapus syarat ${index + 1}`}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>

              {jenis === "fungsi" && !baris.tidakTahu && (
                <div className="kd-check-group">
                  {NILAI_FUNGSI.map((item) => (
                    <label className="kd-check-row" key={item.value}>
                      <input
                        type="checkbox"
                        checked={baris.fungsi.includes(item.value)}
                        onChange={() => toggleFungsi(index, item.value)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              )}

              {jenis === "daftar" && (
                <input
                  value={baris.teks}
                  onChange={(event) => ubahBaris(index, { teks: event.target.value })}
                  placeholder={
                    baris.kolom === "kondisiFisik"
                      ? "Nilai opsi, pisahkan dengan koma. Mis. retak, penyok"
                      : "Nilai bahaya, pisahkan dengan koma. Mis. baterai"
                  }
                  aria-label={`Nilai ${KOLOM_KONDISI[baris.kolom].label}`}
                />
              )}

              {jenis === "rentang" && !baris.tidakTahu && (
                <div className="kd-range-fields">
                  <input
                    type="number"
                    value={baris.min}
                    onChange={(event) => ubahBaris(index, { min: event.target.value })}
                    placeholder="Minimal"
                    aria-label={`${KOLOM_KONDISI[baris.kolom].label} minimal`}
                  />
                  <input
                    type="number"
                    value={baris.max}
                    onChange={(event) => ubahBaris(index, { max: event.target.value })}
                    placeholder="Maksimal"
                    aria-label={`${KOLOM_KONDISI[baris.kolom].label} maksimal`}
                  />
                </div>
              )}

              {jenis === "boolean" && (
                <select
                  value={baris.boolean}
                  onChange={(event) => ubahBaris(index, { boolean: event.target.value })}
                  aria-label="Nilai mengandung bahaya"
                >
                  <option value="true">Ya</option>
                  <option value="false">Tidak</option>
                  <option value="null">Tidak tahu</option>
                </select>
              )}

              {(jenis === "fungsi" || jenis === "rentang") && (
                <label className="kd-check-row">
                  <input
                    type="checkbox"
                    checked={baris.tidakTahu}
                    onChange={(event) => ubahBaris(index, { tidakTahu: event.target.checked })}
                  />
                  Jawaban "tidak tahu"
                </label>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="kd-option-add"
          onClick={tambahBaris}
          disabled={!masihAda}
        >
          <Icon name="plus" size={16} />
          Tambah Syarat
        </button>
      </div>
    );
  }

  function renderTindakanSelect(id, value, onChange) {
    return (
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {TINDAKAN.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    );
  }

  function renderForm() {
    const statusValue = isAturan ? formAturan.status : formFaktor.status;
    const setStatus = (value) =>
      isAturan
        ? setFormAturan((old) => ({ ...old, status: value }))
        : setFormFaktor((old) => ({ ...old, status: value }));

    return (
      <form className="kd-form" onSubmit={handleSubmit}>
        <div className="kd-form-heading">
          <h2>
            {editingId !== null ? "Edit Data" : "Tambah Data"} {activeTab}
          </h2>
          <p>Lengkapi informasi di bawah ini.</p>
        </div>

        <label htmlFor="ka-code">
          Kode {editingId !== null ? "(terkunci setelah dibuat)" : ""}
        </label>
        <input
          id="ka-code"
          value={isAturan ? formAturan.kode : formFaktor.kode}
          disabled={editingId !== null}
          onChange={(event) =>
            isAturan
              ? setFormAturan((old) => ({ ...old, kode: event.target.value }))
              : setFormFaktor((old) => ({ ...old, kode: event.target.value }))
          }
          placeholder={isAturan ? "misalnya ELK-03-DU" : "misalnya PLS-DU"}
          maxLength={30}
          required={editingId === null}
        />

        {isAturan ? (
          <>
            <label htmlFor="ka-name">Nama Aturan</label>
            <input
              id="ka-name"
              value={formAturan.namaAturan}
              onChange={(event) => setFormAturan((old) => ({ ...old, namaAturan: event.target.value }))}
              placeholder="Masukkan nama aturan"
              maxLength={150}
              required
            />

            <label htmlFor="ka-category">Kategori</label>
            <select
              id="ka-category"
              value={formAturan.kategoriId}
              onChange={(event) => setFormAturan((old) => ({ ...old, kategoriId: event.target.value }))}
            >
              <option value="">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nama}
                </option>
              ))}
            </select>

            <label htmlFor="ka-action">Tindakan</label>
            {renderTindakanSelect("ka-action", formAturan.tindakan, (value) =>
              setFormAturan((old) => ({ ...old, tindakan: value }))
            )}

            <label htmlFor="ka-weight">Bobot (-100 sampai 100)</label>
            <input
              id="ka-weight"
              type="number"
              min="-100"
              max="100"
              step="1"
              value={formAturan.bobot}
              onChange={(event) => setFormAturan((old) => ({ ...old, bobot: event.target.value }))}
            />

            <label className="kd-check-row">
              <input
                type="checkbox"
                checked={formAturan.eliminasi}
                onChange={(event) => setFormAturan((old) => ({ ...old, eliminasi: event.target.checked }))}
              />
              Eliminasi tindakan ini jika aturan cocok
            </label>

            {renderKondisiEditor()}

            <label htmlFor="ka-reason">Alasan</label>
            <textarea
              id="ka-reason"
              value={formAturan.alasan}
              onChange={(event) => setFormAturan((old) => ({ ...old, alasan: event.target.value }))}
              placeholder="Alasan yang ditampilkan ke pengguna..."
              maxLength={500}
              rows={4}
              required
            />
          </>
        ) : (
          <>
            <label htmlFor="ka-material">Material (sesuai nama kategori)</label>
            <select
              id="ka-material"
              value={formFaktor.material}
              onChange={(event) => setFormFaktor((old) => ({ ...old, material: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.nama}>
                  {category.nama}
                </option>
              ))}
            </select>

            <label htmlFor="ka-action">Tindakan</label>
            {renderTindakanSelect("ka-action", formFaktor.tindakan, (value) =>
              setFormFaktor((old) => ({ ...old, tindakan: value }))
            )}

            <label htmlFor="ka-value">Nilai Faktor</label>
            <input
              id="ka-value"
              type="number"
              step="any"
              value={formFaktor.nilai}
              onChange={(event) => setFormFaktor((old) => ({ ...old, nilai: event.target.value }))}
              required
            />

            <label htmlFor="ka-unit">Satuan</label>
            <input
              id="ka-unit"
              value={formFaktor.satuan}
              onChange={(event) => setFormFaktor((old) => ({ ...old, satuan: event.target.value }))}
              maxLength={30}
              required
            />
            <p className="form-helper">
              Backend hanya menerima satuan {SATUAN_FAKTOR} (kg CO₂e per kg barang).
            </p>

            <label htmlFor="ka-source">Sumber Data</label>
            <input
              id="ka-source"
              value={formFaktor.sumber}
              onChange={(event) => setFormFaktor((old) => ({ ...old, sumber: event.target.value }))}
              placeholder="Masukkan sumber data"
              maxLength={255}
              required
            />

            <label htmlFor="ka-year">Tahun</label>
            <input
              id="ka-year"
              type="number"
              min="1990"
              max={new Date().getFullYear()}
              value={formFaktor.tahun}
              onChange={(event) => setFormFaktor((old) => ({ ...old, tahun: event.target.value }))}
              required
            />
          </>
        )}

        <label htmlFor="ka-status">Status</label>
        <select id="ka-status" value={statusValue} onChange={(event) => setStatus(event.target.value)}>
          <option value="Aktif">Aktif</option>
          <option value="Nonaktif">Nonaktif</option>
        </select>

        <div className="kd-form-actions">
          <button className="kd-add-button" type="submit" disabled={saving}>
            {saving
              ? "Menyimpan..."
              : editingId !== null
                ? "Simpan Perubahan"
                : "Simpan Data"}
          </button>

          <button className="kd-cancel-button" type="button" onClick={resetForm}>
            Batal
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="kd-page">
      <header className="kd-mobile-header">
        <button
          type="button"
          className="kd-back-button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("admin-menu-change", { detail: { menu: "dashboard" } })
            )
          }
          aria-label="Kembali"
        >
          <Icon name="back" size={21} />
        </button>

        <h1>Kelola Data</h1>

        <button
          type="button"
          className="kd-profile-button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("admin-menu-change", { detail: { menu: "profil" } })
            )
          }
          aria-label="Profil admin"
        >
          <Icon name="user" size={19} />
        </button>
      </header>

      <nav className="kd-tabs" aria-label="Kategori data">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? "kd-tab active" : "kd-tab"}
            onClick={() => handleTabClick(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="kd-toolbar">
        <label className="kd-search-wrap">
          <Icon name="search" size={16} />

          <input
            className="kd-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Cari ${isAturan ? "aturan" : "faktor dampak"}...`}
            aria-label="Cari data"
          />

          {search && (
            <button
              type="button"
              className="kd-clear-search"
              onClick={() => setSearch("")}
              aria-label="Hapus pencarian"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </label>

        <label className="kd-filter-wrap">
          <select
            className="kd-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status"
          >
            <option>Semua Status</option>
            <option>Aktif</option>
            <option>Nonaktif</option>
          </select>

          <Icon name="chevronDown" size={14} />
        </label>
      </div>

      <button
        type="button"
        className="kd-add-button"
        onClick={() => (showForm ? resetForm() : openAddForm())}
      >
        <Icon name={showForm ? "close" : "plus"} size={17} />
        {showForm ? "Tutup Form" : "Tambah Data"}
      </button>

      {loadingData && (
        <div className="kd-message" role="status">
          Memuat data dari backend...
        </div>
      )}

      {message && (
        <div className="kd-message" role="status">
          <span>{message}</span>

          <button type="button" onClick={() => setMessage("")} aria-label="Tutup pesan">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      {showForm && renderForm()}

      <div className="kd-list-heading">
        <h2>{isAturan ? "Daftar Aturan" : "Daftar Faktor Dampak"}</h2>
        <span>{filteredData.length} data ditemukan</span>
      </div>

      {paginatedData.length > 0 ? (
        <div className="kd-card-list">{paginatedData.map(renderCard)}</div>
      ) : (
        <div className="kd-empty">
          <div className="kd-empty-icon">
            <Icon name="empty" size={24} />
          </div>
          <h3>Data tidak ditemukan</h3>
          <p>
            {sourceData.length === 0
              ? "Klik Tambah Data untuk membuat data pertama"
              : "Coba ubah kata kunci atau filter status"}
          </p>
        </div>
      )}

      <div className="kd-pagination">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((page) => page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <Icon name="chevronLeft" size={17} />
        </button>

        <span>
          {filteredData.length === 0 ? 0 : currentPage} /{" "}
          {filteredData.length === 0 ? 0 : totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((page) => page + 1)}
          aria-label="Halaman berikutnya"
        >
          <Icon name="chevronRight" size={17} />
        </button>
      </div>

      {viewingItem && (
        <div
          className="kd-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setViewingItem(null);
          }}
        >
          <section
            className="kd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kd-detail-title"
          >
            <div className="kd-modal-heading">
              <h2>Detail {activeTab}</h2>

              <button
                type="button"
                className="kd-icon-button"
                onClick={() => setViewingItem(null)}
                aria-label="Tutup detail"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="kd-detail-code">
              {viewingItem.code}
              {renderStatus(viewingItem.status)}
            </div>

            <h3 id="kd-detail-title">{viewingItem.title}</h3>

            {renderDetail(viewingItem)}

            <div className="kd-form-actions">
              <button
                type="button"
                className="kd-add-button"
                onClick={() => openEditForm(viewingItem)}
              >
                <Icon name="edit" size={16} />
                Edit Data
              </button>

              <button type="button" className="kd-cancel-button" onClick={closeOverlay}>
                Tutup
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
