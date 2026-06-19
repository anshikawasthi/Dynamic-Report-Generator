// Layout wrapper for the assets report type.
// Renders children in a responsive 2-column grid.

interface Props {
  children?: React.ReactNode;
}

export default function AssetDetailGrid({ children }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {children}
    </div>
  );
}
