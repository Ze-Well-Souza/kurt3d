import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Pencil,
  UserCheck,
  UserX,
  Share2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  listUsers,
  createUser,
  deleteUser,
  resetPassword,
  deactivateUser,
  activateUser,
  editUser,
  requireAuth,
} from "@/lib/api/auth.functions";
import { getPasswordPolicyMessage } from "@/lib/domain/password-policy";
import type { CredentialsPayload } from "@/lib/domain/auth-credentials";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";
import { invalidarPor } from "@/lib/query-keys";
import { CredentialsShareDialog, generateProvisionalPassword } from "./settings-shared";

export function UserManagementCard() {
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ["adminUsers"], queryFn: () => listUsers() });
  const authQ = useQuery({ queryKey: ["authRole"], queryFn: () => requireAuth() });
  const isSuperAdmin = authQ.data?.role === "super_admin";
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    nome: "",
    phone: "",
    username: "",
    password: generateProvisionalPassword(),
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    nome: string;
    username: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", username: "" });
  const [createdCreds, setCreatedCreds] = useState<CredentialsPayload | null>(null);
  const [shareCreds, setShareCreds] = useState<CredentialsPayload | null>(null);
  const [pendingShareUserId, setPendingShareUserId] = useState<string | null>(null);
  const handleCreateUserError = useToastErrorHandler({ fallbackMessage: "Erro ao criar usuário." });
  const handleDeleteUserError = useToastErrorHandler({
    fallbackMessage: "Erro ao remover usuário.",
  });

  const mutateCreate = useMutation({
    mutationFn: () =>
      createUser({
        data: {
          nome: form.nome,
          phone: form.phone,
          username: form.username,
          password: form.password,
        },
      }),
    onSuccess: () => {
      invalidarPor(qc, "gerenciarUsuarios");
      toast.success("Usuário criado.");
      setCreatedCreds({ ...form });
      setForm({ nome: "", phone: "", username: "", password: generateProvisionalPassword() });
      setShowPassword(false);
    },
    onError: handleCreateUserError,
  });

  const mutateDelete = useMutation({
    mutationFn: (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      invalidarPor(qc, "gerenciarUsuarios");
      toast.success("Usuário removido.");
      setDeleteId(null);
    },
    onError: handleDeleteUserError,
  });

  // A senha provisoria agora e gerada no servidor e devolvida so nesta
  // resposta — nunca fica em nenhuma constante nem e persistida em texto
  // plano. Por isso todo reenvio de credenciais precisa resetar de novo: nao
  // ha como reexibir uma senha provisoria ja gerada anteriormente.
  const mutateReset = useMutation({
    mutationFn: (userId: string) => resetPassword({ data: { userId } }),
    onSuccess: (result, userId) => {
      invalidarPor(qc, "gerenciarUsuarios");
      const user = (usersQ.data ?? []).find((u) => u.id === userId);
      if (user) {
        setShareCreds({
          nome: user.nome ?? user.username,
          phone: user.phone ?? "",
          username: user.username,
          password: result.password,
        });
        toast.success("Senha resetada. Envie as novas credenciais ao usuário.");
      } else {
        toast.success("Senha resetada. O usuário deverá trocá-la no próximo acesso.");
      }
    },
    onError: () => toast.error("Erro ao resetar senha."),
  });

  const mutateResetForShare = useMutation({
    mutationFn: (userId: string) => resetPassword({ data: { userId } }),
    onSuccess: (result, userId) => {
      invalidarPor(qc, "gerenciarUsuarios");
      const user = (usersQ.data ?? []).find((u) => u.id === userId);
      if (user) {
        setShareCreds({
          nome: user.nome ?? user.username,
          phone: user.phone ?? "",
          username: user.username,
          password: result.password,
        });
      }
      setPendingShareUserId(null);
    },
    onError: () => {
      toast.error("Erro ao resetar senha.");
      setPendingShareUserId(null);
    },
  });

  const mutateDeactivate = useMutation({
    mutationFn: (userId: string) => deactivateUser({ data: { userId } }),
    onSuccess: () => {
      invalidarPor(qc, "gerenciarUsuarios");
      toast.success("Usuario inativado.");
    },
    onError: () => toast.error("Erro ao inativar."),
  });

  const mutateActivate = useMutation({
    mutationFn: (userId: string) => activateUser({ data: { userId } }),
    onSuccess: () => {
      invalidarPor(qc, "gerenciarUsuarios");
      toast.success("Usuario ativado.");
    },
    onError: () => toast.error("Erro ao ativar."),
  });

  const mutateEdit = useMutation({
    mutationFn: () =>
      editUser({
        data: { userId: editTarget!.id, nome: editForm.nome, username: editForm.username },
      }),
    onSuccess: () => {
      invalidarPor(qc, "gerenciarUsuarios");
      toast.success("Usuario atualizado.");
      setEditTarget(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "";
      if (message === "username_exists") toast.error("Usuario ja existe.");
      else if (message === "username_empty")
        toast.error("O login alternativo nao pode ficar vazio.");
      else toast.error("Erro ao editar.");
    },
  });

  function handleShareCredentialsClick(user: { id: string }) {
    // A senha provisoria nunca fica guardada em texto plano — mesmo que o
    // usuario ainda nao tenha trocado a senha (mustChangePassword: true), o
    // valor gerado no ultimo reset ja foi descartado da memoria do servidor.
    // Reenviar credenciais sempre exige gerar uma senha nova.
    setPendingShareUserId(user.id);
  }

  function confirmShareWithReset() {
    if (pendingShareUserId) {
      mutateResetForShare.mutate(pendingShareUserId);
    }
  }

  const users = usersQ.data ?? [];

  return (
    <>
      <Card className="filament-top overflow-hidden border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold tracking-tight">
                Usuários Admin
              </h2>
            </div>
            {isSuperAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="h-4 w-4" /> Novo Usuário
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isSuperAdmin
              ? "Gerencie os administradores com acesso ao painel."
              : "Somente o super admin pode criar ou remover usuários."}
          </p>
        </div>
        <div className="p-6">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-border px-4 py-3",
                    u.active === false ? "bg-muted/20 opacity-60" : "bg-muted/30",
                  )}
                >
                  <div>
                    <p className="font-medium">
                      {u.nome ?? u.username}
                      {u.mustChangePassword ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Senha provisoria
                        </span>
                      ) : null}
                      {u.active === false ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Inativo
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {u.phone ?? u.username} · {u.role === "super_admin" ? "Super Admin" : "Admin"}
                    </p>
                  </div>
                  {isSuperAdmin && u.role !== "super_admin" && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditTarget({ id: u.id, nome: u.nome ?? "", username: u.username });
                          setEditForm({ nome: u.nome ?? "", username: u.username });
                        }}
                        title="Editar nome e login"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => mutateReset.mutate(u.id)}
                        disabled={mutateReset.isPending}
                        title="Resetar senha para Kurti-3D"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-[#25D366]"
                        onClick={() => handleShareCredentialsClick(u)}
                        disabled={mutateResetForShare.isPending}
                        title="Enviar credenciais por WhatsApp"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {u.active !== false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-amber-600"
                          onClick={() => mutateDeactivate.mutate(u.id)}
                          disabled={mutateDeactivate.isPending}
                          title="Inativar usuario"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-green-600"
                          onClick={() => mutateActivate.mutate(u.id)}
                          disabled={mutateActivate.isPending}
                          title="Reativar usuario"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(u.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create user dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(o) => {
          if (!o) {
            setShowDialog(false);
            setCreatedCreds(null);
            setShowPassword(false);
            setForm({ nome: "", phone: "", username: "", password: generateProvisionalPassword() });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {createdCreds ? (
            <CredentialsShareDialog
              creds={createdCreds}
              title="Usuario criado — envie o acesso"
              warnSingleView
              onClose={() => {
                setShowDialog(false);
                setCreatedCreds(null);
              }}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Novo Usuário Admin</DialogTitle>
              </DialogHeader>
              <form
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  const passwordMessage = getPasswordPolicyMessage(form.password);
                  if (passwordMessage) {
                    toast.error(passwordMessage);
                    return;
                  }
                  mutateCreate.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome do usuário"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="11967428594"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Usuário (login alternativo)</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="nome_usuario"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha provisória</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="8+ caracteres, maiuscula, minuscula e numero"
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm((f) => ({ ...f, password: generateProvisionalPassword() }));
                        setShowPassword(true);
                      }}
                    >
                      Gerar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No primeiro acesso, o usuário será obrigado a trocar esta senha por uma pessoal.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-filament" disabled={mutateCreate.isPending}>
                    {mutateCreate.isPending ? "Criando..." : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Share credentials dialog (for resend after creation or after reset) */}
      <Dialog open={!!shareCreds} onOpenChange={(o) => !o && setShareCreds(null)}>
        <DialogContent className="sm:max-w-md">
          {shareCreds && (
            <CredentialsShareDialog
              creds={shareCreds}
              title="Reenvio de Credenciais"
              warnSingleView
              onClose={() => setShareCreds(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation before reset when user has already changed password */}
      <Dialog open={!!pendingShareUserId} onOpenChange={(o) => !o && setPendingShareUserId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar credenciais</DialogTitle>
            <DialogDescription>
              Para gerar a mensagem de acesso, a senha sera resetada para uma nova senha provisoria
              e o usuario devera troca-la no proximo login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setPendingShareUserId(null)}>
              Cancelar
            </Button>
            <Button
              className="btn-filament gap-2"
              onClick={confirmShareWithReset}
              disabled={mutateResetForShare.isPending}
            >
              <RefreshCw
                className={cn("h-4 w-4", mutateResetForShare.isPending && "animate-spin")}
              />
              {mutateResetForShare.isPending ? "Resetando..." : "Resetar e Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) mutateDelete.mutate(deleteId);
              }}
              disabled={mutateDelete.isPending}
            >
              {mutateDelete.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              mutateEdit.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                placeholder="Nome do usuário"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Usuário (login alternativo)</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="nome_usuario"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-filament" disabled={mutateEdit.isPending}>
                {mutateEdit.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
