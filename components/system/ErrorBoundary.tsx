"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<
  Props,
  State
> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error) {
    console.error("TwinCore ErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#07070A] text-white flex items-center justify-center px-5">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
            <div className="mb-3 text-sm tracking-[0.28em] text-white/45">
              TWINCORE
            </div>

            <h1 className="text-2xl font-semibold">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/60">
              TwinCore hit an unexpected state.
              Refresh to continue syncing.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 h-12 w-full rounded-2xl bg-white text-sm font-semibold text-black"
            >
              Reload TwinCore
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}