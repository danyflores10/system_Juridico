import { tasks } from "./_components/data";
import { Tasks } from "./_components/tasks";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl tracking-tight">Tareas jurídicas</h2>
        <p className="text-muted-foreground">Organiza las actuaciones, vencimientos y documentos pendientes del mes.</p>
      </div>
      <Tasks data={tasks} />
    </div>
  );
}
