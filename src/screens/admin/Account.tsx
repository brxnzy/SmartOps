import { useEffect, useMemo, useState } from "react";
import { ImageOff, UserRound } from "lucide-react";
import Button from "../../components/Button";
import Field from "../../components/Field";
import FileInput from "../../components/FileInput";
import Input from "../../components/Input";
import useAuth from "../../hooks/useAuth";
import {
  deleteUserPhoto,
  updateUserProfile,
  uploadUserPhoto,
} from "../../services/profile.service";
import { notifications } from "../../services/notification.service";

export default function Account() {
  const { authUser, userProfile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    setName(userProfile?.name ?? "");
    setIdCard(userProfile?.idCard ?? "");
    setSelectedFile(null);
    setRemovePhoto(false);
    setFileInputKey((current) => current + 1);
  }, [userProfile?.id, userProfile?.name, userProfile?.idCard, userProfile?.photoUrl]);

  const hasChanges = useMemo(() => {
    const cleanName = name.trim();
    const cleanIdCard = idCard.trim();
    const initialName = userProfile?.name?.trim() ?? "";
    const initialIdCard = userProfile?.idCard?.trim() ?? "";

    const nameChanged = cleanName !== initialName;
    const idCardChanged = cleanIdCard !== initialIdCard;
    const photoChanged = Boolean(selectedFile) || (removePhoto && !!userProfile?.photoUrl);

    return nameChanged || idCardChanged || photoChanged;
  }, [idCard, name, removePhoto, selectedFile, userProfile?.idCard, userProfile?.name, userProfile?.photoUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setRemovePhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setRemovePhoto(true);
    setFileInputKey((current) => current + 1);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authUser?.id) return;

    const cleanName = name.trim();
    const cleanIdCard = idCard.trim();

    if (!cleanName) {
      notifications.warning({
        title: "Nombre requerido",
        description: "Ingresa tu nombre para guardar los cambios.",
      });
      return;
    }

    setSubmitting(true);

    try {
      let photoUrl: string | null | undefined = undefined;

      if (selectedFile) {
        photoUrl = await uploadUserPhoto({ userId: authUser.id, file: selectedFile });
      }

      if (removePhoto) {
        await deleteUserPhoto(authUser.id);
        photoUrl = null;
      }

      await updateUserProfile({
        userId: authUser.id,
        name: cleanName,
        idCard: cleanIdCard || null,
        photoUrl,
      });

      await refreshProfile();
      setSelectedFile(null);
      setRemovePhoto(false);
      setFileInputKey((current) => current + 1);

      notifications.success({
        title: "Perfil actualizado",
        description: "Tus datos fueron guardados correctamente.",
      });
    } catch (error) {
      notifications.error({
        title: "No se pudieron guardar los cambios",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900">Mi cuenta</h1>
            <p className="text-sm text-slate-500">
              Actualiza tu informacion personal y tu foto de perfil.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userProfile?.photoUrl && !removePhoto ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile?.name ?? "Foto de perfil"}
                className="h-14 w-14 rounded-full object-cover border border-slate-200 bg-white"
              />
            ) : (
              <UserRound size={56} className="text-slate-400" />
            )}
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Field label="Nombre">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre completo"
              maxLength={120}
            />
          </Field>

          <Field label="Cedula">
            <Input
              value={idCard}
              onChange={(event) => setIdCard(event.target.value)}
              placeholder="Ejemplo: 001-0000000-0"
              maxLength={40}
            />
          </Field>

          <FileInput
            key={fileInputKey}
            id="profile-photo"
            label="Foto de perfil"
            accept="image/*"
            onChange={handleFileChange}
            disabled={submitting}
          />

          {userProfile?.photoUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Foto actual guardada. Si quieres quitarla, usa el boton de abajo.
              </p>
              <Button
                type="button"
                onClick={handleRemovePhoto}
                disabled={submitting}
                className="border-red-300 text-red-700 hover:bg-red-50"
                icon={<ImageOff size={16} />}
              >
                Quitar foto
              </Button>
            </div>
          ) : null}

          {removePhoto ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Se eliminara tu foto actual al guardar.
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={submitting || !hasChanges}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Guardar cambios
          </Button>
        </div>
      </form>
    </section>
  );
}
