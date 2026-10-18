import { useEffect, useState } from "react";
import { apiRequest } from "./services/api";

/** CRUD editor for backend entities whose schemas are domain-specific. */
export default function AdminJsonManager({ resource, title }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [json, setJson] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await apiRequest(`/admin/${resource}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      setRows(data);
      setMessage("");
    } catch (error) {
      setMessage(error.message || `Gagal memuat ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [resource]);

  function startCreate() {
    setSelectedId(null);
    setJson(resource === "aturan"
      ? JSON.stringify({ kode: "KODE_ATURAN", namaAturan: "Nama aturan", kategoriId: null, kondisi: {}, tindakan: "daur_ulang", bobot: 0, eliminasi: false, alasan: "Alasan aturan", status: "aktif" }, null, 2)
      : JSON.stringify({ kode: "KODE_FAKTOR", material: "Organik", tindakan: "daur_ulang", nilai: 0, satuan: "kgCO2e/kg", sumber: "Sumber data", tahun: new Date().getFullYear(), status: "aktif" }, null, 2));
    setMessage("Edit JSON contoh dengan field yang sesuai aturan backend.");
  }

  function startEdit(row) {
    setSelectedId(row.id);
    const { id, createdAt, updatedAt, admin, kategori, versi, ...editable } = row;
    setJson(JSON.stringify(editable, null, 2));
    setMessage("Field kode dikunci oleh backend setelah data dibuat.");
  }

  async function handleSave(event) {
    event.preventDefault();
    let payload;
    try { payload = JSON.parse(json); }
    catch { setMessage("JSON belum valid. Periksa tanda kurung dan koma."); return; }
    setSaving(true);
    try {
      await apiRequest(selectedId === null ? `/admin/${resource}` : `/admin/${resource}/${selectedId}`, {
        method: selectedId === null ? "POST" : "PUT",
        body: JSON.stringify(payload),
      });
      setMessage("Data berhasil disimpan ke database.");
      setSelectedId(null);
      await load();
    } catch (error) {
      setMessage(error.errors?.map((item) => item.message).join(" ") || error.message || "Gagal menyimpan data.");
    } finally { setSaving(false); }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Hapus data ${row.kode || row.namaAturan || row.id}?`)) return;
    try {
      await apiRequest(`/admin/${resource}/${row.id}`, { method: "DELETE" });
      setMessage("Data berhasil dihapus.");
      if (selectedId === row.id) setSelectedId(null);
      await load();
    } catch (error) {
      setMessage(error.message || "Data tidak bisa dihapus; mungkin masih digunakan oleh analisis.");
    }
  }

  return <section style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div><p>Be4Throw / Admin / Kelola Data</p><h1>{title}</h1><p>Perubahan dikirim ke API admin dan disimpan di database.</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("admin-menu-change", { detail: { menu: "dashboard" } }))}>Kembali ke Dashboard</button><button type="button" onClick={startCreate}>Tambah {title}</button></div>
    </header>
    {message && <p role="status" style={{ padding: 12, background: "#f1f5f9", borderRadius: 8 }}>{message}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, margin: "20px 0" }}>
      {loading ? <p>Memuat data...</p> : rows.map((row) => <article key={row.id} style={{ border: "1px solid #dbe2ea", borderRadius: 12, padding: 16 }}>
        <strong>{row.kode || row.namaAturan || `${title} #${row.id}`}</strong>
        <p>{row.namaAturan || row.material || row.tindakan || "Data backend"}</p>
        <small>ID {row.id} · {row.status || "—"}</small>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button type="button" onClick={() => startEdit(row)}>Edit JSON</button><button type="button" onClick={() => handleDelete(row)}>Hapus</button></div>
      </article>)}
      {!loading && rows.length === 0 && <p>Belum ada data pada backend.</p>}
    </div>
    <form onSubmit={handleSave} style={{ display: "grid", gap: 10 }}>
      <h2>{selectedId === null ? `Tambah ${title}` : `Edit ${title} #${selectedId}`}</h2>
      <label htmlFor={`json-${resource}`}>Payload JSON</label>
      <textarea id={`json-${resource}`} value={json} onChange={(event) => setJson(event.target.value)} rows={16} spellCheck={false} style={{ width: "100%", fontFamily: "monospace", padding: 12, border: "1px solid #cbd5e1", borderRadius: 8 }} />
      <div style={{ display: "flex", gap: 8 }}><button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan ke Database"}</button><button type="button" onClick={() => { setSelectedId(null); setJson("{}"); setMessage(""); }}>Bersihkan</button></div>
    </form>
  </section>;
}
