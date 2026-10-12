import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback; defaults to the Indonesian message below. */
  fallback?: ReactNode;
  /** Short label of the guarded area, used in the default message. */
  label?: string;
}

interface State {
  error: Error | null;
}

/** Catches render errors so one failing section never blanks the whole page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[SolarVein] Render error:', error, info.componentStack);
  }

  private retry = (): void => this.setState({ error: null });

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    const label = this.props.label ?? 'Bagian ini';
    return (
      <div role="alert" className="mx-auto my-10 max-w-xl rounded-xl border border-red-400/40 bg-red-500/10 p-6 text-center">
        <p className="text-lg font-semibold">{label} gagal ditampilkan.</p>
        <p className="mt-2 text-sm opacity-80">
          Terjadi kesalahan tak terduga. Coba muat ulang bagian ini; bila masih gagal, segarkan halaman.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={this.retry}
            className="rounded-lg border border-current px-4 py-2 text-sm font-medium"
          >
            Coba lagi
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-current px-4 py-2 text-sm font-medium"
          >
            Segarkan halaman
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
