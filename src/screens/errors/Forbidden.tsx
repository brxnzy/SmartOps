export default function Forbidden() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold text-slate-800">403</h1>
      <p className="text-slate-600">No tienes permisos para acceder a esta pagina.</p>
    </section>
  );
}
