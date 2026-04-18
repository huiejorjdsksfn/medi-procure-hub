/** EL5 MediProcure v5.8  -- Workflow Optimization Engine */
export interface WorkflowStep { id: string; name: string; approverRole: string; timeoutHours: number; autoApprove?: boolean; }
export interface AutoApprovalRule { maxAmount: number; supplierTrustLevel: string; enabled: boolean; }
export interface EscalationRule { department: string; escalateAfterHours: number; escalateTo: string; }
export interface ProcurementWorkflow { id: string; steps: WorkflowStep[]; autoApprovalRules: AutoApprovalRule[]; escalationMatrix: EscalationRule[]; }
export interface OptimizedWorkflow { parallelSteps: string[][]; autoApprovalRules: AutoApprovalRule[]; estimatedTimeSavings: number; }

export class WorkflowOptimizerEngine {
  optimizeProcurementWorkflow(workflow: ProcurementWorkflow): OptimizedWorkflow {
    const parallelSteps = this.identifyParallel(workflow.steps);
    return {
      parallelSteps,
      autoApprovalRules: [
        { maxAmount: 10000, supplierTrustLevel: 'trusted', enabled: true },
        { maxAmount: 5000, supplierTrustLevel: 'any', enabled: true },
        ...workflow.autoApprovalRules,
      ],
      estimatedTimeSavings: this.calcSavings(workflow, parallelSteps),
    };
  }
  private identifyParallel(steps: WorkflowStep[]): string[][] {
    const groups: string[][] = [];
    for (let i = 0; i < steps.length; i += 2) {
      groups.push(steps.slice(i, i + 2).map(s => s.id));
    }
    return groups;
  }
  private calcSavings(w: ProcurementWorkflow, groups: string[][]): number {
    const serial = w.steps.reduce((s, step) => s + step.timeoutHours, 0);
    const parallel = groups.reduce((s, g) => s + Math.max(...g.map(id => {
      const step = w.steps.find(s2 => s2.id === id);
      return step?.timeoutHours || 0;
    })), 0);
    return Math.max(0, serial - parallel);
  }
}
export const workflowOptimizer = new WorkflowOptimizerEngine();
