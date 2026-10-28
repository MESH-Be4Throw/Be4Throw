import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./services/api";
import AdminAvatar from "./AdminAvatar";
import "./KelolaData.css";

const tabs = ["Kategori", "Barang", "Pertanyaan"];

export function Icon({ name, size = 17 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    back: <path d="m15 18-6-6 6-6M9 12h12" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21v-1a7 7 0 0 1 14 0v1" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4.3-.9L20 7.4 16.6 4 4.9 15.7 4 20Z" />
        <path d="M13 20h8" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
      </>
    ),
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    chevronDown: <path d="m7 10 5 5 5-5" />,
    empty: (
      <>
        <path d="m12 4 8 8-8 8-8-8 8-8Z" />
        <path d="M9 12h6" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

function getCode(item, prefix) {
  if (item.code) return item.code;

  return `${prefix}-${String(item.id).padStart(2, "0")}`;
}

const QUESTION_TYPE_LABELS = {
  pilihan_tunggal: "Pilihan tunggal",
  pilihan_ganda: "Pilihan ganda",
  angka: "Angka",
  ya_tidak: "Ya / Tidak",
};

function renderQuestionDetail(item) {
  const opsi = item.opsi;
  const choices = Array.isArray(opsi) ? opsi : [];
  const isNumber =
    item.questionType === "angka" &&
    opsi &&
    !Array.isArray(opsi);

  return (
    <dl className="kd-detail-list">
      <dt>Tipe</dt>
      <dd>
        {QUESTION_TYPE_LABELS[item.questionType] ||
          item.questionType}
      </dd>

      {choices.length > 0 && (
        <>
          <dt>Pilihan jawaban</dt>
          <dd>
            <ul className="kd-detail-options">
              {choices.map((option, index) => (
                <li key={option.nilai || index}>
                  {option.label || option.nilai}
                </li>
              ))}
            </ul>
          </dd>
        </>
      )}

      {isNumber && (
        <>
          <dt>Rentang nilai</dt>
          <dd>
            {opsi.min ?? "-"} - {opsi.max ?? "-"}{" "}
            {opsi.satuan || ""}
          </dd>
        </>
      )}

      <dt>Wajib diisi</dt>
      <dd>{item.required ? "Ya" : "Tidak"}</dd>

      <dt>Boleh "Tidak tahu"</dt>
      <dd>{item.unknownAllowed ? "Ya" : "Tidak"}</dd>

      <dt>Urutan</dt>
      <dd>{item.order ?? 0}</dd>
    </dl>
  );
}

export default function KelolaData({ initialTab }) {
  const [activeTab, setActiveTab] = useState(
    tabs.includes(initialTab) ? initialTab : "Kategori"
  );

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedQuestionCategory, setSelectedQuestionCategory] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    indukId: "",
    tampilJikaJawaban: "",
    name: "",
    description: "",
    category: "",
    status: "Aktif",
    title: "",
    content: "",
    code: "",
    questionType: "pilihan_tunggal",
    optionsJson: '[]',
    required: true,
    unknownAllowed: false,
    order: 0,
    image: "",
    estimatedWeight: "",
  });
  const [questionOptions, setQuestionOptions] = useState(["", ""]);

  async function loadAdminData() {
    setLoadingData(true);
    try {
      const [categoryResponse, itemResponse, questionResponse] = await Promise.all([
        apiRequest("/admin/kategori"), apiRequest("/admin/barang"), apiRequest("/admin/pertanyaan"),
      ]);
      const categoryRows = categoryResponse.data || [];
      const itemRows = itemResponse.data || [];
      const questionRows = questionResponse.data || [];
      setCategories(categoryRows.map((item) => ({ ...item, name: item.nama, description: item.deskripsi || "", status: item.status === "aktif" ? "Aktif" : "Nonaktif" })));
      setItems(itemRows.map((item) => ({ ...item, name: item.nama, category: item.kategori?.nama || "", categoryId: item.kategoriId, description: item.estimasiBerat != null ? `Estimasi berat: ${item.estimasiBerat} kg` : "Estimasi berat belum ditentukan", status: item.status === "aktif" ? "Aktif" : "Nonaktif" })));
      setQuestions(
  questionRows.map((item) => ({
    ...item,
    code: item.kode,
    title: item.teks,
    content: `Tipe: ${item.tipe}`,
    optionsJson: JSON.stringify(item.opsi ?? [], null, 2),
    questionType: item.tipe,
    required: item.wajib,
    unknownAllowed: item.bolehTidakTahu,
    order: item.urutan,
    category: item.kategori?.nama || "",
    status: item.status === "aktif" ? "Aktif" : "Nonaktif",
    indukId: item.indukId ?? "",
    tampilJikaJawaban: item.tampilJika?.jawaban ?? "",
    inti: Boolean(item.inti),
  }))
);
    } catch (err) {
      setMessage(err.message || "Gagal mengambil data admin. Pastikan login sebagai admin dan backend aktif.");
    } finally {
      setLoadingData(false);
    }
  }

function buatNilaiOpsi(label) {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

const NILAI_FUNGSI_UTAMA = [
  "berfungsi_penuh",
  "berfungsi_sebagian",
  "tidak_berfungsi",
];

  useEffect(() => { loadAdminData(); }, []);

  useEffect(() => {
    function handleMenuChange(event) {
      const menu = event.detail?.menu;

      const tabMap = {
        kategori: "Kategori",
        barang: "Barang",
        pertanyaan: "Pertanyaan",
      };

      if (tabMap[menu]) {
        changeTab(tabMap[menu]);
      }
    }

    window.addEventListener("admin-menu-change", handleMenuChange);

    return () => {
      window.removeEventListener(
        "admin-menu-change",
        handleMenuChange
      );
    };
  }, []);

  useEffect(() => {
    if (tabs.includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const sourceData =
  activeTab === "Kategori"
    ? categories
    : activeTab === "Barang"
      ? items
      : selectedQuestionCategory
        ? questions.filter(
            (question) =>
              question.category === selectedQuestionCategory
          )
        : questions;
         const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sourceData.filter((item) => {
      const searchable = [
        item.name,
        item.title,
        item.code,
        item.category,
        item.description,
        item.content,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(keyword);

      const matchesStatus =
        statusFilter === "Semua Status" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sourceData, search, statusFilter]);

  const pageSize = 4;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / pageSize)
  );

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function changeTab(tab) {
    setActiveTab(tab);
    setSearch("");
    setStatusFilter("Semua Status");
    setCurrentPage(1);
    setShowForm(false);
    setEditingId(null);
    setViewingItem(null);
    setSelectedQuestionCategory(null);
    setMessage("");
  }

  function resetForm() {
    setQuestionOptions(["", ""]);
    setForm({
      indukId: "",
      tampilJikaJawaban: "",
      name: "",
      description: "",
      category: categories[0]?.name || "",
      status: "Aktif",
      title: "",
      content: "",
      code: "", questionType: "pilihan_tunggal", optionsJson: '[]', required: true, unknownAllowed: false, order: 0, image: "", estimatedWeight: "",
    });

    setShowForm(false);
    setEditingId(null);
  }

  function openAddForm() {
    setEditingId(null);
    setViewingItem(null);
    setQuestionOptions(["", ""]);
    

    setForm({
      indukId: "",
      tampilJikaJawaban: "",
      name: "",
      description: "",
      category:
      selectedQuestionCategory || categories[0]?.name || "",
      status: "Aktif",
      title: "",
      content: "",
      code: "", questionType: "pilihan_tunggal", optionsJson: '[]', required: true, unknownAllowed: false, order: 0, image: "", estimatedWeight: "",
    });

    setMessage("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setViewingItem(null);
    const savedOptions = Array.isArray(item.opsi)
  ? item.opsi.map((option) => option.label || "")
  : [];

setQuestionOptions(
  savedOptions.length > 0 ? savedOptions : ["", ""]
);

    setForm({
      indukId: item.indukId ?? "",
      tampilJikaJawaban: item.tampilJika?.jawaban ?? "",
      name: item.name || "",
      description: item.description || "",
      category: item.category || categories[0]?.name || "",
      status: item.status || "Aktif",
      title: item.title || "",
      content: item.content || "",
      code: item.code || "", questionType: item.questionType || "pilihan_tunggal", optionsJson: item.optionsJson || '{"pilihan": []}', required: item.required ?? true, unknownAllowed: item.unknownAllowed ?? false, order: item.order ?? 0, image: item.gambar || "", estimatedWeight: item.estimasiBerat ?? "",
    });

    setMessage("");
    setShowForm(true);
  }

  
  async function handleSubmit(event) {
    event.preventDefault();

    const isQuestion = activeTab === "Pertanyaan";
    const isCategory = activeTab === "Kategori";

    const name = isQuestion ? form.title.trim() : form.name.trim();
    const description = isQuestion
      ? form.content.trim()
      : form.description.trim();

    if (!name) {
      setMessage("Nama atau judul wajib diisi.");
      return;
    }

    if (isQuestion && !form.code.trim() && editingId === null) {
      setMessage("Kode pertanyaan wajib diisi, misalnya kondisi_fisik.");
      return;
    }
    if (
  isQuestion &&
  form.indukId &&
  !form.tampilJikaJawaban
) {
  setMessage(
    "Pilih jawaban pemicu untuk pertanyaan lanjutan."
  );
  return;
}

    try {
      let payload;
      let endpoint;

      if (isCategory) {
        endpoint = "/admin/kategori";

        payload = {
          nama: name,
          deskripsi: description || null,
          status: form.status === "Aktif" ? "aktif" : "nonaktif",
      
        };
      } else if (isQuestion) {
        endpoint = "/admin/pertanyaan";

        const isChoiceQuestion = [
          "pilihan_tunggal",
          "pilihan_ganda",
        ].includes(form.questionType);

        const pilihan = questionOptions
          .map((option) => option.trim())
          .filter(Boolean);

        if (isChoiceQuestion && pilihan.length < 2) {
          setMessage("Isi minimal 2 pilihan jawaban.");
          return;
        }

        const kodePertanyaan = form.code.trim().toLowerCase();
        let opsi = {};

        if (form.questionType === "ya_tidak") {
          opsi = [
            { nilai: "ya", label: "Ya" },
            { nilai: "tidak", label: "Tidak" },
          ];
        } else if (isChoiceQuestion) {
          const nilaiKhusus =
            kodePertanyaan === "fungsi_utama"
              ? NILAI_FUNGSI_UTAMA
              : null;

          opsi = pilihan.map((label, index) => ({
            nilai: nilaiKhusus
              ? nilaiKhusus[index] || buatNilaiOpsi(label)
              : buatNilaiOpsi(label),
            label,
          }));
        }

        payload = {
  kategoriId: Number(
    categories.find(
      (item) => item.name === form.category
    )?.id
  ),
  teks: name,
  tipe: form.questionType,
  opsi,
  wajib: Boolean(form.required),
  bolehTidakTahu: Boolean(form.unknownAllowed),
  urutan: Number(form.order) || 0,
  status: form.status === "Aktif" ? "aktif" : "nonaktif",

  // Relasi pertanyaan lanjutan
  indukId: form.indukId
    ? Number(form.indukId)
    : null,

  tampilJika: form.indukId
    ? { jawaban: form.tampilJikaJawaban }
    : null,
};

        if (editingId === null) {
          payload.kode = kodePertanyaan;
        }
      } else {
        endpoint = "/admin/barang";

        payload = {
          nama: name,
          kategoriId: Number(
            categories.find(
              (item) => item.name === form.category
            )?.id
          ),
          gambar: form.image.trim() || null,
          estimasiBerat:
            form.estimatedWeight === ""
              ? null
              : Number(form.estimatedWeight),
          status: form.status === "Aktif" ? "aktif" : "nonaktif",
        };
      }

      if (
        !isCategory &&
        !categories.some((item) => item.name === form.category)
      ) {
        setMessage("Pilih kategori yang valid terlebih dahulu.");
        return;
      }

      await apiRequest(
        editingId !== null
          ? `${endpoint}/${editingId}`
          : endpoint,
        {
          method: editingId !== null ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      await loadAdminData();

      setMessage(
        editingId !== null
          ? "Data berhasil diperbarui di database."
          : "Data berhasil ditambahkan ke database."
      );

      resetForm();
    } catch (err) {
      setMessage(
        err.errors?.map((item) => item.message).join(" ") ||
          err.message ||
          "Gagal menyimpan data ke backend."
      );
    }
  }


  async function handleDelete(item) {
    const label = item.name || item.title;

    if (!window.confirm(`Hapus data "${label}"?`)) return;

    {
      try {
        const resource = activeTab === "Kategori" ? "kategori" : activeTab === "Barang" ? "barang" : "pertanyaan";
        await apiRequest(`/admin/${resource}/${item.id}`, { method: "DELETE" });
        await loadAdminData();
        setViewingItem(null);
        setMessage(`${label} berhasil dihapus dari database.`);
      } catch (err) {
        setMessage(err.message || "Data tidak dapat dihapus. Mungkin masih digunakan oleh data lain.");
      }
      return;
    }
  }

  function closeOverlay() {
    resetForm();
    setViewingItem(null);
  }

  function renderStatus(status) {
    const active = status === "Aktif";

    return (
      <span
        className={`kd-status ${active ? "active" : "inactive"}`}
      >
        {active ? "AKTIF" : "NON-AKTIF"}
      </span>
    );
  }

  function renderCard(item) {
    const code = getCode(
      item,
      activeTab === "Kategori"
        ? "KAT"
        : activeTab === "Barang"
          ? "BRG"
          : "TNY"
    );

    const title = item.name || item.title;

    const description =
      item.description || item.content || "Belum ada deskripsi.";

    return (
      <article className="kd-card" key={item.id}>
        <div className="kd-card-top">
          <div className="kd-card-meta">
            <span className="kd-code">{code}</span>
            {renderStatus(item.status)}
          </div>

          <div className="kd-card-actions">
            <button
              type="button"
              className="kd-icon-button"
              title="Lihat detail"
              aria-label={`Lihat ${title}`}
              onClick={() => setViewingItem(item)}
            >
              <Icon name="eye" size={16} />
            </button>

            <button
              type="button"
              className="kd-icon-button"
              title="Edit data"
              aria-label={`Edit ${title}`}
              onClick={() => openEditForm(item)}
            >
              <Icon name="edit" size={16} />
            </button>

            <button
              type="button"
              className="kd-icon-button danger"
              title="Hapus data"
              aria-label={`Hapus ${title}`}
              onClick={() => handleDelete(item)}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>

        <h3 className="kd-card-title">{title}</h3>

        {activeTab === "Barang" && (
          <p className="kd-card-category">
            Kategori: {item.category || "-"}
          </p>
        )}

        <p className="kd-card-description">{description}</p>
      </article>
    );
  }

  return (
    <section className="kd-page">
      <header className="kd-mobile-header">
        <button
          type="button"
          className="kd-back-button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("admin-menu-change", {
                detail: { menu: "dashboard" },
              })
            );
          }}
          aria-label="Kembali"
        >
          <Icon name="back" size={21} />
        </button>

        <h1>Kelola Data</h1>

        <button
          type="button"
          className="kd-profile-button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("admin-menu-change", {
                detail: { menu: "profil" },
              })
            );
          }}
          aria-label="Profil admin"
        >
          <AdminAvatar fallback={<Icon name="user" size={19} />} />
        </button>
      </header>

      <nav className="kd-tabs" aria-label="Kategori data">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={
              activeTab === tab ? "kd-tab active" : "kd-tab"
            }
            onClick={() => changeTab(tab)}
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
            placeholder={`Cari ${
              activeTab === "Kategori"
                ? "data"
                : activeTab === "Barang"
                  ? "barang"
                  : "pertanyaan"
            }...`}
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
        onClick={() => {
          if (showForm) {
            resetForm();
          } else {
            openAddForm();
          }
        }}
      >
        {showForm ? (
          <Icon name="close" size={17} />
        ) : (
          <Icon name="plus" size={17} />
        )}

        {showForm ? "Tutup Form" : "Tambah Data"}
      </button>

      {loadingData && <div className="kd-message" role="status">Memuat data dari backend...</div>}

      {message && (
        <div className="kd-message" role="status">
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Tutup pesan"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      {showForm && (
        <form className="kd-form" onSubmit={handleSubmit}>
          <div className="kd-form-heading">
            <h2>
              {editingId !== null ? "Edit Data" : "Tambah Data"}{" "}
              {activeTab}
            </h2>
            <p>Lengkapi informasi di bawah ini.</p>
          </div>

          <label htmlFor="kd-name">
            {activeTab === "Pertanyaan"
              ? "Judul Pertanyaan"
              : activeTab === "Barang"
                ? "Nama Barang"
                : "Nama Kategori"}
          </label>

          <input
            id="kd-name"
            value={
              activeTab === "Pertanyaan" ? form.title : form.name
            }
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                [activeTab === "Pertanyaan" ? "title" : "name"]:
                  event.target.value,
              }))
            }
            placeholder={
              activeTab === "Pertanyaan"
                ? "Masukkan judul pertanyaan"
                : activeTab === "Barang"
                  ? "Masukkan nama barang"
                  : "Masukkan nama kategori"
            }
            required
          />

          {activeTab !== "Kategori" && (
  <>
    <label htmlFor="kd-category">Kategori</label>

    <select
      id="kd-category"
      disabled={
        activeTab === "Pertanyaan" &&
        selectedQuestionCategory !== null
      }
                value={form.category}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    category: event.target.value,
                  }))
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {activeTab === "Barang" && (
            <>
              <label htmlFor="kd-image">URL Gambar (opsional)</label>
              <input id="kd-image" type="url" value={form.image} onChange={(event) => setForm((old) => ({ ...old, image: event.target.value }))} placeholder="https://..." />
              <label htmlFor="kd-weight">Estimasi Berat (kg, opsional)</label>
              <input id="kd-weight" type="number" min="0.01" max="1000" step="0.01" value={form.estimatedWeight} onChange={(event) => setForm((old) => ({ ...old, estimatedWeight: event.target.value }))} />
            </>
          )}

          {activeTab === "Pertanyaan" && (
            <>
              <label htmlFor="kd-code">Kode Pertanyaan {editingId !== null ? "(terkunci setelah dibuat)" : ""}</label>
              <input id="kd-code" value={form.code} disabled={editingId !== null} onChange={(event) => setForm((old) => ({ ...old, code: event.target.value }))} placeholder="misalnya kondisi_fisik" required={editingId === null} />
              <label htmlFor="kd-question-type">Tipe Pertanyaan</label>
              <select id="kd-question-type" value={form.questionType} onChange={(event) => setForm((old) => ({ ...old, questionType: event.target.value }))} disabled={Boolean(
  questions.find((question) => question.id === editingId)?.inti
)}>
                <option value="pilihan_tunggal">Pilihan tunggal</option><option value="pilihan_ganda">Pilihan ganda</option><option value="angka">Angka</option><option value="ya_tidak">Ya / Tidak</option>
              </select>
              {/* PERTANYAAN INDUK */}
<label htmlFor="kd-parent-question">
  Pertanyaan Induk
</label>

<select
  id="kd-parent-question"
  value={form.indukId}
  onChange={(event) =>
    setForm((old) => ({
      ...old,
      indukId: event.target.value,
      tampilJikaJawaban: "",
    }))
  }
>
  <option value="">Tidak ada (pertanyaan utama)</option>

  {questions
    .filter((question) => {
      const sameCategory =
        question.kategoriId ===
        Number(
          categories.find(
            (category) => category.name === form.category
          )?.id
        );

      const validType = [
        "pilihan_tunggal",
        "ya_tidak",
      ].includes(question.questionType);

      const notSelf = question.id !== editingId;
      const isMainQuestion = !question.indukId;

      return (
        sameCategory &&
        validType &&
        notSelf &&
        isMainQuestion
      );
    })
    .map((question) => (
      <option key={question.id} value={String(question.id)}>
        {question.code} — {question.title}
      </option>
    ))}
</select>

{form.indukId !== "" && (
  <>
    <label htmlFor="kd-parent-answer">
      Tampilkan Jika Jawaban Induk
      <span className="required-mark">*</span>
    </label>

    <select
      id="kd-parent-answer"
      value={form.tampilJikaJawaban}
      onChange={(event) =>
        setForm((old) => ({
          ...old,
          tampilJikaJawaban: event.target.value,
        }))
      }
      required
    >
      <option value="">Pilih jawaban pemicu...</option>

      {(() => {
        const parent = questions.find(
          (question) =>
            question.id === Number(form.indukId)
        );

        const options = Array.isArray(parent?.opsi)
          ? parent.opsi
          : [];

        return options.map((option) => (
          <option
            key={option.nilai}
            value={option.nilai}
          >
            {option.label} ({option.nilai})
          </option>
        ));
      })()}
    </select>

    <p className="form-helper">
      Pertanyaan ini hanya ditampilkan ketika pengguna
      memilih jawaban pemicu tersebut.
    </p>
  </>
)}
              
{["pilihan_tunggal", "pilihan_ganda"].includes(
  form.questionType
) && (
  <div className="kd-options-editor">
    <label>Pilihan Jawaban</label>
    <p className="kd-options-hint">
      Tambahkan pilihan untuk responden.
    </p>

    {questionOptions.map((option, index) => (
      <div className="kd-option-row" key={index}>
        <span className="kd-option-number">
          {form.questionType === "pilihan_tunggal" ? "◯" : "☐"}
        </span>

        <input
          value={option}
          onChange={(event) =>
            setQuestionOptions((previous) =>
              previous.map((value, i) =>
                i === index ? event.target.value : value
              )
            )
          }
          placeholder={`Pilihan ${index + 1}`}
          aria-label={`Pilihan jawaban ${index + 1}`}
        />

        <button
          type="button"
          className="kd-option-remove"
          disabled={questionOptions.length <= 2}
          onClick={() =>
            setQuestionOptions((previous) =>
              previous.filter((_, i) => i !== index)
            )
          }
          aria-label={`Hapus pilihan ${index + 1}`}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    ))}

    <button
      type="button"
      className="kd-option-add"
      onClick={() =>
        setQuestionOptions((previous) => [...previous, ""])
      }
    >
      <Icon name="plus" size={16} />
      Tambah Pilihan
    </button>
  </div>
)}
              <label htmlFor="kd-order">Urutan</label>
              <input id="kd-order" type="number" min="0" max="1000" value={form.order} onChange={(event) => setForm((old) => ({ ...old, order: event.target.value }))} />
              <label className="kd-check-row"><input type="checkbox" checked={form.required} onChange={(event) => setForm((old) => ({ ...old, required: event.target.checked }))} /> Wajib dijawab</label>
              <label className="kd-check-row"><input type="checkbox" checked={form.unknownAllowed} onChange={(event) => setForm((old) => ({ ...old, unknownAllowed: event.target.checked }))} /> Boleh memilih tidak tahu</label>
            </>
          )}

          {activeTab !== "Pertanyaan" && <label htmlFor="kd-description">Deskripsi</label>}

          {activeTab !== "Pertanyaan" && <textarea
            id="kd-description"
            value={form.description}
            onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
            placeholder="Masukkan deskripsi..."
            rows={4}
          />}

          <label htmlFor="kd-status">Status</label>

          <select
  id="kd-status"
  value={form.status}
  disabled={Boolean(
    questions.find(
      (question) => question.id === editingId
    )?.inti
  )}
  onChange={(event) =>
    setForm((previous) => ({
      ...previous,
      status: event.target.value,
    }))
  }
>
  <option value="Aktif">Aktif</option>
  <option value="Nonaktif">Nonaktif</option>
</select>

          <div className="kd-form-actions">
            <button className="kd-add-button" type="submit">
              {editingId !== null ? "Simpan Perubahan" : "Simpan Data"}
            </button>

            <button
              className="kd-cancel-button"
              type="button"
              onClick={resetForm}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      
{activeTab === "Pertanyaan" &&
selectedQuestionCategory === null ? (
  <>
    <div className="kd-list-heading">
      <h2>Kategori Pertanyaan</h2>
      <span>{categories.length} kategori</span>
    </div>

    <p className="kd-category-instruction">
      Pilih kategori untuk mengelola pertanyaan di dalamnya.
    </p>

    <div className="kd-question-category-list">
      {categories
        .filter((category) =>
          category.name.toLowerCase().includes(search.trim().toLowerCase())
        )
        .filter((category) =>
          statusFilter === "Semua Status" ||
          category.status === statusFilter
        )
        .map((category) => {
          const count = questions.filter(
            (question) => question.category === category.name
          ).length;

          return (
            <button
              type="button"
              className="kd-question-category-card"
              key={category.id}
              onClick={() =>
                setSelectedQuestionCategory(category.name)
              }
            >
              <span className="kd-question-category-icon">
                <Icon name="empty" size={23} />
              </span>

              <span className="kd-question-category-info">
                <strong>{category.name}</strong>
                <span>{count} pertanyaan</span>
              </span>

              <Icon name="chevronRight" size={22} />
            </button>
          );
        })}
    </div>
  </>
) : (
  <>
    <div className="kd-list-heading">
      <h2>
        {activeTab === "Pertanyaan"
          ? `Pertanyaan — ${selectedQuestionCategory}`
          : `Daftar ${activeTab}`}
      </h2>
      <span>{filteredData.length} data ditemukan</span>
    </div>

    {activeTab === "Pertanyaan" && (
      <button
        type="button"
        className="kd-cancel-button kd-back-category"
        onClick={() => {
          setSelectedQuestionCategory(null);
          setShowForm(false);
          setEditingId(null);
          setSearch("");
          setCurrentPage(1);
          setMessage("");
        }}
      >
        <Icon name="back" size={16} />
        Kembali ke Kategori
      </button>
    )}

    {paginatedData.length > 0 ? (
      <div className="kd-card-list">
        {paginatedData.map(renderCard)}
      </div>
    ) : (
      <div className="kd-empty">
        <div className="kd-empty-icon">
          <Icon name="empty" size={24} />
        </div>
        <h3>
          {activeTab === "Pertanyaan"
            ? "Belum ada pertanyaan di kategori ini"
            : "Data tidak ditemukan"}
        </h3>
        <p>
          {activeTab === "Pertanyaan"
            ? "Klik Tambah Data untuk membuat pertanyaan pertama"
            : "Coba ubah kata kunci atau filter status"}
        </p>
      </div>
    )}
  </>
)}


           {!(activeTab === "Pertanyaan" &&
        selectedQuestionCategory === null) && (
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
      )}

      {viewingItem && (
        <div
          className="kd-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setViewingItem(null);
            }
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
              {getCode(
                viewingItem,
                activeTab === "Kategori"
                  ? "KAT"
                  : activeTab === "Barang"
                    ? "BRG"
                    : "TNY"
              )}

              {renderStatus(viewingItem.status)}
            </div>

            <h3 id="kd-detail-title">
              {viewingItem.name || viewingItem.title}
            </h3>

            {viewingItem.category && (
              <p className="kd-detail-category">
                Kategori: {viewingItem.category}
              </p>
            )}

            {activeTab === "Pertanyaan" ? (
  renderQuestionDetail(viewingItem)
) : (
  <p className="kd-detail-description">
    {viewingItem.description ||
      viewingItem.content ||
      "Belum ada deskripsi."}
  </p>
)}

            <div className="kd-form-actions">
              <button
                type="button"
                className="kd-add-button"
                onClick={() => openEditForm(viewingItem)}
              >
                <Icon name="edit" size={16} />
                Edit Data
              </button>

              <button
                type="button"
                className="kd-cancel-button"
                onClick={closeOverlay}
              >
                Tutup
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}