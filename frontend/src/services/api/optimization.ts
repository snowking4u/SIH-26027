import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type {
  BlockPlan,
  BlockPlanCreate,
  BlockPlanTask,
  ControllerDecision,
  ControllerDecisionCreate,
  ExecutionOutcome,
  MaybePaginated,
  OptimizationInput,
  OptimizationOutput,
  OptimizationRun,
  OptimizationValidation,
} from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/optimization/plans — persisted block-plan roster. */
export async function fetchOptimizationPlans(params?: ListParams): Promise<BlockPlan[]> {
  return toList(await apiGet<MaybePaginated<BlockPlan>>("/api/optimization/plans", params));
}

/** POST /api/optimization/plans — create a block plan (persists; real mutation). */
export async function createOptimizationPlan(body: BlockPlanCreate): Promise<BlockPlan> {
  return apiPost<BlockPlan>("/api/optimization/plans", body);
}

/** GET /api/optimization/plan-tasks — tasks attached to block plans. */
export async function fetchOptimizationPlanTasks(params?: ListParams): Promise<BlockPlanTask[]> {
  return toList(await apiGet<MaybePaginated<BlockPlanTask>>("/api/optimization/plan-tasks", params));
}

/** GET /api/optimization/inputs — block-plan optimization inputs. */
export async function fetchOptimizationInputs(params?: ListParams): Promise<OptimizationInput[]> {
  return toList(await apiGet<MaybePaginated<OptimizationInput>>("/api/optimization/inputs", params));
}

/** GET /api/optimization/outputs — block-plan optimization outputs. */
export async function fetchOptimizationOutputs(params?: ListParams): Promise<OptimizationOutput[]> {
  return toList(await apiGet<MaybePaginated<OptimizationOutput>>("/api/optimization/outputs", params));
}

/** GET /api/optimization/runs — optimization run records. */
export async function fetchOptimizationRuns(params?: ListParams): Promise<OptimizationRun[]> {
  return toList(await apiGet<MaybePaginated<OptimizationRun>>("/api/optimization/runs", params));
}

/** GET /api/optimization/validations — validation records for block plans. */
export async function fetchOptimizationValidations(params?: ListParams): Promise<OptimizationValidation[]> {
  return toList(await apiGet<MaybePaginated<OptimizationValidation>>("/api/optimization/validations", params));
}

/** GET /api/optimization/decisions — controller/decision records. */
export async function fetchOptimizationDecisions(params?: ListParams): Promise<ControllerDecision[]> {
  return toList(await apiGet<MaybePaginated<ControllerDecision>>("/api/optimization/decisions", params));
}

/** POST /api/optimization/decisions — record a human controller decision (real mutation). */
export async function createOptimizationDecision(body: ControllerDecisionCreate): Promise<ControllerDecision> {
  return apiPost<ControllerDecision>("/api/optimization/decisions", body);
}

/** POST /api/optimization/plans/{id}/validate — deterministic plan validation. */
export async function validateOptimizationPlan(planId: number): Promise<OptimizationValidation[]> {
  return apiPost<OptimizationValidation[]>(`/api/optimization/plans/${planId}/validate`, {});
}

/** GET /api/optimization/execution-outcomes — recorded execution outcomes. */
export async function fetchExecutionOutcomes(params?: ListParams): Promise<ExecutionOutcome[]> {
  return toList(await apiGet<MaybePaginated<ExecutionOutcome>>("/api/optimization/execution-outcomes", params));
}