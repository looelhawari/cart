import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import type { User, AdminRole } from "@/types";

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => userService.getUsers({ per_page: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsDialogOpen(false);
      reset();
      toast({ title: t("users.createSuccess") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      toast({ title: t("users.updateSuccess") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("users.deleteSuccess") });
    },
  });

  const { register, handleSubmit, reset, setValue } = useForm();

  const onSubmit = (data: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setValue("first_name", user.first_name);
    setValue("last_name", user.last_name);
    setValue("email", user.email);
    setValue("phone", user.phone);
    setValue("role", user.role);
    setValue("is_active", user.is_active);
  };

  const getRoleBadge = (role: AdminRole) => {
    const config: Record<AdminRole, string> = {
      owner: "bg-red-100 text-red-800",
      admin: "bg-purple-100 text-purple-800",
      support: "bg-orange-100 text-orange-800",
      manager: "bg-blue-100 text-blue-800",
      sales: "bg-green-100 text-green-800",
      cashier: "bg-yellow-100 text-yellow-800",
    };
    return config[role] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div
        className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-3xl font-bold text-elbaraka-primary">
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("users.subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setIsDialogOpen(true);
            reset();
          }}
          className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
        >
          <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
          {t("users.addUser")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">{t("common.loading")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className={`${isRTL ? "text-right" : "text-left"} p-3`}>
                      {t("users.name")}
                    </th>
                    <th className={`${isRTL ? "text-right" : "text-left"} p-3`}>
                      {t("users.email")}
                    </th>
                    <th className={`${isRTL ? "text-right" : "text-left"} p-3`}>
                      {t("users.phone")}
                    </th>
                    <th className={`${isRTL ? "text-right" : "text-left"} p-3`}>
                      {t("users.role")}
                    </th>
                    <th className={`${isRTL ? "text-right" : "text-left"} p-3`}>
                      {t("common.status")}
                    </th>
                    <th className={`${isRTL ? "text-right" : "text-left"} p-3`}>
                      {t("users.lastLogin")}
                    </th>
                    <th className={`${isRTL ? "text-left" : "text-right"} p-3`}>
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(usersData?.data as User[] | undefined)?.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-elbaraka-primary flex items-center justify-center text-white font-semibold">
                            {user.first_name.charAt(0)}
                            {user.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            {user.two_factor_enabled && (
                              <span className="flex items-center text-xs text-green-600">
                                <Shield
                                  className={`h-3 w-3 ${isRTL ? "ml-1" : "mr-1"}`}
                                />
                                {t("users.twoFactorEnabled")}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">{user.phone}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(user.role)}`}
                        >
                          {user.role.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            user.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.is_active
                            ? t("common.active")
                            : t("common.inactive")}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {user.last_login_at
                          ? formatDate(user.last_login_at)
                          : t("common.never")}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm(t("users.deleteConfirm"))) {
                                deleteMutation.mutate(user.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen || !!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setEditingUser(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t("users.editUser") : t("users.createUser")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">{t("users.firstName")} *</Label>
                <Input
                  id="first_name"
                  {...register("first_name", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">{t("users.lastName")} *</Label>
                <Input
                  id="last_name"
                  {...register("last_name", { required: true })}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">{t("users.email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t("users.phone")} *</Label>
                <Input id="phone" {...register("phone", { required: true })} />
              </div>
            </div>
            {!editingUser && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">{t("users.password")} *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password", { required: !editingUser })}
                  />
                </div>
                <div>
                  <Label htmlFor="password_confirmation">
                    {t("users.confirmPassword")} *
                  </Label>
                  <Input
                    id="password_confirmation"
                    type="password"
                    {...register("password_confirmation", {
                      required: !editingUser,
                    })}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="role">{t("users.role")} *</Label>
              <Select
                onValueChange={(value) => setValue("role", value)}
                defaultValue={editingUser?.role}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("users.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div
              className={`flex items-center ${isRTL ? "space-x-reverse space-x-2" : "space-x-2"}`}
            >
              <input
                type="checkbox"
                id="is_active"
                {...register("is_active")}
                defaultChecked={editingUser?.is_active ?? true}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active">{t("common.active")}</Label>
            </div>
            <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingUser(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingUser ? t("common.update") : t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
