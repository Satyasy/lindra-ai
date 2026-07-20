"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  ACCEPTED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  deleteDocument,
  ingestDocument,
  isAcceptedFilename,
} from "@/lib/ai/ingest-policy";

export interface UploadResult {
  ok: boolean;
  message: string;
}

// Server action = endpoint POST publik. Layout /bk hanya menjaga HALAMAN, bukan
// action-nya — guard WAJIB di sini, jangan andalkan UI. (CLAUDE.md §keamanan)
async function assertStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  return session.user.email ?? "staff";
}

export async function uploadDocument(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  await assertStaff();

  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");

  if (!title) return { ok: false, message: "Judul dokumen wajib diisi." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pilih berkas terlebih dahulu." };
  }
  // Validasi lewat ekstensi, bukan file.type: browser mengirim MIME yang tidak
  // konsisten untuk .md (kadang text/markdown, kadang application/octet-stream).
  if (!isAcceptedFilename(file.name)) {
    return {
      ok: false,
      message: `Format tidak didukung. Hanya ${ACCEPTED_EXTENSIONS.join(" / ")} — simpan dokumen sebagai teks polos dulu.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "Ukuran berkas maksimal 2MB." };
  }

  let result: { chunks: number; embedded: number };
  try {
    result = await ingestDocument(title, await file.text());
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal memproses dokumen." };
  }

  revalidatePath("/bk/dokumen");

  // Jangan bilang "berhasil" begitu saja kalau jalur vector-nya kosong — itu
  // persis kegagalan senyap yang bikin orang mengira "retrieval-nya jelek".
  if (result.embedded === 0) {
    return {
      ok: true,
      message: `${result.chunks} bagian tersimpan, tapi TIDAK ada yang terindeks vektor — dokumen ini hanya bisa ditemukan lewat kata kunci. Biasanya EMBEDDING_API_KEY belum diisi.`,
    };
  }
  if (result.embedded < result.chunks) {
    return {
      ok: true,
      message: `${result.chunks} bagian tersimpan, ${result.embedded} terindeks vektor. Sisanya hanya bisa ditemukan lewat kata kunci — cek kuota vendor embedding.`,
    };
  }
  return {
    ok: true,
    message: `${result.chunks} bagian tersimpan dan semuanya terindeks vektor.`,
  };
}

export async function removeDocument(formData: FormData) {
  await assertStaff();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await deleteDocument(title);
  revalidatePath("/bk/dokumen");
}
