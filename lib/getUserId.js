export function getUserId() {
  if (typeof window === 'undefined') return 'N/A';
  let id = localStorage.getItem("nb_user_id");
  if (!id) {
    id = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    localStorage.setItem("nb_user_id", id);
  }
  return id;
}
