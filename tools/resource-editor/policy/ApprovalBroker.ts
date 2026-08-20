export interface PendingApproval {
  readonly approvalId: string;
  readonly requestId: string;
  readonly reason: string;
  readonly target: string;
  readonly options: readonly { readonly optionId: string; readonly label: string; readonly kind: string }[];
  readonly expiresAt: string;
}

interface ApprovalWaiter {
  readonly request: PendingApproval;
  readonly resolve: (optionId: string | null) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export class ApprovalBroker {
  private readonly pending = new Map<string, ApprovalWaiter>();

  public constructor(private readonly ttlMs = 120_000) {}

  public request(request: Omit<PendingApproval, "expiresAt">): Promise<string | null> {
    if (this.pending.has(request.approvalId)) throw new Error("중복 승인 요청이다.");
    const expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.approvalId);
        resolve(null);
      }, this.ttlMs);
      this.pending.set(request.approvalId, { request: { ...request, expiresAt }, resolve, timer });
    });
  }

  public get(approvalId: string): PendingApproval | undefined {
    return this.pending.get(approvalId)?.request;
  }

  public decide(approvalId: string, optionId: string | null): boolean {
    const waiter = this.pending.get(approvalId);
    if (!waiter) return false;
    clearTimeout(waiter.timer);
    this.pending.delete(approvalId);
    const validOption = optionId === null || waiter.request.options.some((option) => option.optionId === optionId);
    waiter.resolve(validOption ? optionId : null);
    return validOption;
  }

  public cancelAll(): void {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    this.pending.clear();
  }
}
