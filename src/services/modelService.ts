import type { Account, BudgetCategory, SavingsModel, SimulationEvent } from "../types";

export const cloneModel = (model: SavingsModel): SavingsModel => JSON.parse(JSON.stringify(model));

export const updateAccount = (
  model: SavingsModel,
  accountId: string,
  updater: (account: Account) => Account,
): SavingsModel => ({
  ...model,
  accounts: model.accounts.map((account) => (account.id === accountId ? updater(account) : account)),
});

export const updateSimulationEvent = (
  model: SavingsModel,
  eventId: string,
  updater: (event: SimulationEvent) => SimulationEvent,
): SavingsModel => ({
  ...model,
  simulationEvents: model.simulationEvents.map((event) => (event.id === eventId ? updater(event) : event)),
});

export const updateBudgetCategory = (
  model: SavingsModel,
  categoryId: string,
  updater: (category: BudgetCategory) => BudgetCategory,
): SavingsModel => ({
  ...model,
  budget: {
    ...model.budget,
    categories: model.budget.categories.map((category) => (category.id === categoryId ? updater(category) : category)),
  },
});

export const removeBudgetBranch = (model: SavingsModel, categoryId: string): SavingsModel => {
  const toDelete = new Set<string>([categoryId]);
  let changed = true;

  while (changed) {
    changed = false;
    model.budget.categories.forEach((category) => {
      if (category.parentId && toDelete.has(category.parentId) && !toDelete.has(category.id)) {
        toDelete.add(category.id);
        changed = true;
      }
    });
  }

  return {
    ...model,
    budget: {
      ...model.budget,
      categories: model.budget.categories.filter((category) => !toDelete.has(category.id)),
    },
  };
};
