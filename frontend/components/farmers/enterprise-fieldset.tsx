"use client";

import { Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  emptyAnimal,
  emptyField,
  type EnterpriseDraft,
} from "@/components/farmers/draft";

export interface EnterpriseFieldsetProps {
  enterprise: EnterpriseDraft;
  onChange: (next: EnterpriseDraft) => void;
  onRemove: () => void;
}

export function EnterpriseFieldset({
  enterprise,
  onChange,
  onRemove,
}: EnterpriseFieldsetProps) {
  const isDairy = enterprise.type === "Dairy";

  return (
    <div className="rounded-card border border-outline bg-surface p-4">
      <div className="flex items-center justify-between">
        <Badge tone="brand">{enterprise.type}</Badge>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-muted transition-colors hover:text-danger"
        >
          Remove enterprise
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {isDairy
          ? enterprise.animals.map((a, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-3 rounded-md border border-outline p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              >
                <Field
                  label="Breed"
                  value={a.breed}
                  placeholder="e.g. Friesian"
                  onChange={(e) => {
                    const animals = [...enterprise.animals];
                    animals[i] = { ...a, breed: e.target.value };
                    onChange({ ...enterprise, animals });
                  }}
                />
                <Field
                  label="Lactation stage"
                  value={a.lactationStage}
                  placeholder="e.g. Early"
                  onChange={(e) => {
                    const animals = [...enterprise.animals];
                    animals[i] = { ...a, lactationStage: e.target.value };
                    onChange({ ...enterprise, animals });
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...enterprise,
                      animals: enterprise.animals.filter((_, x) => x !== i),
                    })
                  }
                  className="h-10 text-sm text-muted transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </div>
            ))
          : enterprise.fields.map((fld, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-3 rounded-md border border-outline p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <Field
                  label="Variety"
                  value={fld.variety}
                  placeholder="e.g. CO 0323"
                  onChange={(e) => {
                    const fields = [...enterprise.fields];
                    fields[i] = { ...fld, variety: e.target.value };
                    onChange({ ...enterprise, fields });
                  }}
                />
                <Field
                  label="Area (ha)"
                  type="number"
                  inputMode="decimal"
                  value={fld.areaHa}
                  placeholder="e.g. 1.5"
                  onChange={(e) => {
                    const fields = [...enterprise.fields];
                    fields[i] = { ...fld, areaHa: e.target.value };
                    onChange({ ...enterprise, fields });
                  }}
                />
                <Field
                  label="Ratoon cycle"
                  type="number"
                  value={fld.ratoonCycle}
                  placeholder="e.g. 1"
                  onChange={(e) => {
                    const fields = [...enterprise.fields];
                    fields[i] = { ...fld, ratoonCycle: e.target.value };
                    onChange({ ...enterprise, fields });
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...enterprise,
                      fields: enterprise.fields.filter((_, x) => x !== i),
                    })
                  }
                  className="h-10 text-sm text-muted transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </div>
            ))}

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            isDairy
              ? onChange({
                  ...enterprise,
                  animals: [...enterprise.animals, emptyAnimal()],
                })
              : onChange({
                  ...enterprise,
                  fields: [...enterprise.fields, emptyField()],
                })
          }
        >
          {isDairy ? "Add animal" : "Add field"}
        </Button>
      </div>
    </div>
  );
}
