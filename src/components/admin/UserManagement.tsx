import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { soundFX } from '../../lib/audio';
import { formatDateArabic, isValidQuadName, isDefaultSupervisor } from '../../lib/utils';
import { createUserByAdmin, updateUserRole, deleteUser } from '../../lib/firebase';
import {
  Users,
  UserPlus,
  Shield,
  GraduationCap,
  Search,
  Check,
  AlertCircle,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  onReloadUsers: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onReloadUsers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userNotification, setUserNotification] = useState<string | null>(null);

  // New user form state
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!searchTerm.trim()) return true;
    return u.fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = isValidQuadName(newFullName);
    if (!val.valid) {
      soundFX.playError();
      setFormError(val.message || 'يرجى إدخال الاسم الرباعي كاملاً');
      return;
    }

    setLoadingAdd(true);
    soundFX.playPop();

    try {
      await createUserByAdmin(newFullName.trim(), newRole);
      soundFX.playSuccess();
      setShowAddModal(false);
      setNewFullName('');
      setNewRole('student');
      onReloadUsers();
    } catch (err) {
      console.error(err);
      soundFX.playError();
      setFormError('حدث خطأ أثناء إضافة الحساب');
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleToggleRole = async (user: User) => {
    if (isDefaultSupervisor(user.fullName) && user.role === 'admin') {
      soundFX.playError();
      setUserNotification('لا يمكن تغيير صلاحية المشرف الرئيسي للمنصة');
      setTimeout(() => setUserNotification(null), 3500);
      return;
    }

    const newTargetRole: UserRole = user.role === 'admin' ? 'student' : 'admin';
    soundFX.playPop();

    try {
      await updateUserRole(user.id, newTargetRole);
      soundFX.playSuccess();
      onReloadUsers();
    } catch (err) {
      console.error(err);
      soundFX.playError();
      setUserNotification('حدث خطأ أثناء تعديل صلاحية الحساب');
      setTimeout(() => setUserNotification(null), 3500);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (isDefaultSupervisor(userToDelete.fullName)) {
      setUserNotification('لا يمكن حذف حساب المشرف الرئيسي');
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    soundFX.playPop();
    try {
      await deleteUser(userToDelete.id);
      soundFX.playSuccess();
      setUserToDelete(null);
      onReloadUsers();
    } catch (err) {
      console.error(err);
      soundFX.playError();
      setUserNotification('حدث خطأ أثناء حذف الحساب');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const studentsCount = users.filter((u) => u.role === 'student').length;

  return (
    <div className="space-y-6">
      {userNotification && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-b-4 border-amber-400 text-amber-900 text-xs font-black flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{userNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setUserNotification(null)}
            className="text-amber-700 hover:text-amber-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="duo-card p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] flex items-center justify-center text-white shadow-xs">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">إدارة الحسابات والمستخدمين</h2>
              <p className="text-xs font-semibold text-slate-500">
                استعراض الحسابات المضافة، إضافة حساب جديد، وترقية الحسابات إلى مشرفين
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl duo-btn-green font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>إضافة حساب جديد</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم الرباعي..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#58cc02] outline-none text-xs sm:text-sm font-bold text-slate-800 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                roleFilter === 'admin'
                  ? 'bg-[#ff9600] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              المشرفون ({adminsCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('student')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                roleFilter === 'student'
                  ? 'bg-[#1cb0f6] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الطلاب ({studentsCount})
            </button>
          </div>
        </div>
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map((user) => {
          const isSupervisor = user.role === 'admin';
          const isMainAdmin = isDefaultSupervisor(user.fullName);

          return (
            <div
              key={user.id}
              className={`duo-card p-5 bg-white flex flex-col justify-between transition-all hover:translate-y-[-2px] ${
                isSupervisor ? 'border-amber-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl border-2 border-b-4 flex items-center justify-center font-black ${
                      isSupervisor
                        ? 'bg-amber-50 border-[#ff9600] text-[#ff9600]'
                        : 'bg-sky-50 border-[#1cb0f6] text-[#1cb0f6]'
                    }`}
                  >
                    {isSupervisor ? (
                      <Shield className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <GraduationCap className="w-5 h-5 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-800 leading-snug">
                      {user.fullName}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-400">
                      تاريخ التسجيل: {formatDateArabic(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isMainAdmin ? (
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      المشرف الرئيسي
                    </span>
                  ) : isSupervisor ? (
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                      مشرف
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                      طالب مختبر
                    </span>
                  )}
                </div>
              </div>

              {/* Action row */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400">
                  آخر دخول: {formatDateArabic(user.lastLoginAt)}
                </span>

                {!isMainAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleRole(user)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSupervisor
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      {isSupervisor ? (
                        <span>تحويل إلى طالب</span>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>ترقية إلى مشرف</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setUserToDelete(user);
                      }}
                      className="w-8 h-8 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer transition-all"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-md w-full bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#58cc02]" />
                <h3 className="text-base font-black text-slate-800">
                  إضافة حساب جديد إلى المنظومة
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  الاسم الرباعي كاملاً:
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="مثال: يوسف إبراهيم خالد محمود"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 border-b-4 focus:border-[#58cc02] outline-none text-xs sm:text-sm font-bold text-slate-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  صلاحية الحساب:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRole('student')}
                    className={`p-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 cursor-pointer ${
                      newRole === 'student'
                        ? 'border-[#1cb0f6] bg-sky-50 text-sky-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>طالب مختبر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`p-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 cursor-pointer ${
                      newRole === 'admin'
                        ? 'border-[#ff9600] bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>مشرف بالمنصة</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loadingAdd || !newFullName.trim()}
                  className="flex-1 py-3 rounded-xl duo-btn-green font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingAdd ? 'جاري الإضافة...' : 'إضافة الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="duo-card max-w-sm w-full bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-800">حذف الحساب</h3>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-700 mb-2">
              هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً؟
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
              <span className="text-xs font-black text-slate-800">{userToDelete.fullName}</span>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                الرتبة: {userToDelete.role === 'admin' ? 'مشرف' : 'طالب مختبر'}
              </p>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mb-4">
              سيتم حذف الحساب وسجل نتائجه ومحاولاته بالكامل من قاعدة البيانات.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="flex-1 py-3 rounded-xl duo-btn-outline font-black text-xs cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="flex-1 py-3 rounded-xl duo-btn-red font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
