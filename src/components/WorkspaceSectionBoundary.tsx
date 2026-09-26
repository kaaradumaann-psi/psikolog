import { Component, Fragment } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  children: ReactNode;
  title: string;
  description: string;
};

type State = {
  failed: boolean;
  retryKey: number;
};

/**
 * A local render boundary for non-clinical workspace sections. A management
 * panel failure must not replace logout, account identity, or the whole app
 * with the global recovery screen.
 */
export class WorkspaceSectionBoundary extends Component<Props, State> {
  state: State = { failed: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never print error.message here: third-party messages can contain account
    // metadata. The component chain and error type are enough for diagnosis.
    console.error('Çalışma alanı bölümünde beklenmedik hata', {
      type: error.name,
      component: info.componentStack,
    });
  }

  private retry = () => {
    this.setState((state) => ({ failed: false, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (this.state.failed) {
      return (
        <section className="section-recovery" role="alert">
          <span className="section-recovery-icon" aria-hidden="true"><Icon name="alert" size={19} /></span>
          <div>
            <h2>{this.props.title}</h2>
            <p>{this.props.description}</p>
            <button type="button" className="btn-secondary btn-sm" onClick={this.retry}>
              <Icon name="refresh" size={14} /> Bölümü yeniden dene
            </button>
          </div>
        </section>
      );
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
  }
}
