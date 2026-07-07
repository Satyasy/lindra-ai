// Dipanggil QuickExit: hapus cookie sesi siswa
export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": "lindra_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      "Cache-Control": "no-store",
    },
  });
}
