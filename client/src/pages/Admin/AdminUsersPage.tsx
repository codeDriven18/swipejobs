import { useEffect, useState } from 'react';
import { adminApi } from '@/api/adminApi';
import { UserRole, UserRoleLabels } from '@/models/auth';
import type { AdminUser } from '@/models/admin';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './AdminPage.module.css';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi.getUsers()
      .then((items) => {
        setUsers(items);
      })
      .catch(() => {
        setUsers([]);
        setError('Could not load users. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (user: AdminUser, role: UserRole) => {
    await adminApi.updateUserRole(user.id, role);
    load();
  };

  if (loading) return <p className={styles.status}>Loading users...</p>;

  if (error) {
    return (
      <EmptyState
        illustration="applications"
        title="Users unavailable"
        description={error}
        actions={[{ label: 'Retry', onClick: load, primary: true }]}
      />
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        illustration="applications"
        title="No users found"
        description="The users list is empty or your account may not have access."
        actions={[{ label: 'Refresh', onClick: load, primary: true }]}
      />
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <span className={styles.tableToolbarTitle}>Users ({users.length})</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Applications</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td><span className={styles.roleBadge}>{UserRoleLabels[user.role]}</span></td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>{user.applicationCount ?? 0}</td>
                  <td>
                    <div className={styles.actions}>
                      {user.role !== UserRole.Admin && (
                        <button type="button" className={styles.btnGhost} onClick={() => void changeRole(user, UserRole.Admin)}>
                          Make admin
                        </button>
                      )}
                      {user.role !== UserRole.Company && (
                        <button type="button" className={styles.btnGhost} onClick={() => void changeRole(user, UserRole.Company)}>
                          Set company
                        </button>
                      )}
                      {user.role !== UserRole.JobSeeker && (
                        <button type="button" className={styles.btnGhost} onClick={() => void changeRole(user, UserRole.JobSeeker)}>
                          Set seeker
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
