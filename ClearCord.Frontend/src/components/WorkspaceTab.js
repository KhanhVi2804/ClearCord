function WorkspaceTab({
  id,
  activeView,
  onSelect,
  badge,
  children
}) {
  return (
    <button
      type="button"
      className={`workspace-tab ${activeView === id ? "active" : ""}`}
      onClick={() => onSelect(id)}
    >
      <span>{children}</span>
      {badge ? <strong>{badge}</strong> : null}
    </button>
  );
}

export default WorkspaceTab;
