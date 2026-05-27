<script setup lang="ts">
import { computed } from "vue";
import { Button, Icon } from "@pinlay/design";
import { useSettings, type PlanId } from "../composables/useSettings";
import { useIntegrations } from "@/features/integrations/composables/useIntegrations";
import { SESSIONS } from "@/shared/lib/data";
import SectionHeading from "./SectionHeading.vue";

const { workspace, members, setPlan } = useSettings();
const { connectedCount } = useIntegrations();

const PRICE_PER_SEAT = 9;

const pinsThisMonth = computed(() =>
  SESSIONS.reduce((acc, s) => acc + s.pinCount, 0),
);
const activeSeats = computed(
  () => members.value.filter((m) => m.status === "active").length,
);

interface UsageMetric {
  key: string;
  icon: string;
  label: string;
  current: number;
  limit: number;
}

const usage = computed<UsageMetric[]>(() => [
  {
    key: "pins",
    icon: "map-pin",
    label: "Pins / month",
    current: pinsThisMonth.value,
    limit: 100,
  },
  {
    key: "members",
    icon: "users",
    label: "Members",
    current: members.value.length,
    limit: 3,
  },
  {
    key: "integrations",
    icon: "plug",
    label: "Integrations",
    current: connectedCount.value,
    limit: 2,
  },
]);

const isFree = computed(() => workspace.plan === "free");

function usagePct(m: UsageMetric) {
  return Math.min(100, (m.current / m.limit) * 100);
}
function usageBar(m: UsageMetric) {
  const ratio = m.current / m.limit;
  if (ratio >= 1) return "bg-destructive";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-primary";
}

const monthlyTotal = computed(() => activeSeats.value * PRICE_PER_SEAT);
const nextInvoiceDate = computed(() => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
});

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "For solo devs and tiny teams.",
    features: [
      "100 pins / month",
      "Up to 3 members",
      "2 integrations connected",
      "30-day pin history",
      "Community support",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$9",
    period: "/ user / month",
    tagline: "For teams shipping every week.",
    features: [
      "Unlimited pins & sessions",
      "Unlimited members & workspaces",
      "All integrations",
      "Unlimited history",
      "AI summaries on every session",
      "Priority support",
    ],
  },
];

const currentPlan = computed(() => workspace.plan);

function isCurrent(id: PlanId) {
  return currentPlan.value === id;
}
function actionLabel(id: PlanId) {
  if (isCurrent(id)) return "Current plan";
  return id === "team" ? "Upgrade to Team" : "Downgrade to Free";
}
function change(id: PlanId) {
  if (isCurrent(id)) return;
  setPlan(id);
}
</script>

<template>
  <SectionHeading
    title="Billing"
    subtitle="Choose the plan that fits your team."
  />

  <div class="mb-6">
    <h3
      class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"
    >
      Current usage
    </h3>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        v-for="m in usage"
        :key="m.key"
        class="flex flex-col gap-2 rounded-lg border bg-card p-4"
      >
        <div
          class="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Icon :name="m.icon" :size="14" />
          <span>{{ m.label }}</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-xl font-semibold tracking-tight">{{
            m.current
          }}</span>
          <span class="text-xs text-muted-foreground">/ {{ m.limit }}</span>
        </div>
        <div class="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full transition-all"
            :class="usageBar(m)"
            :style="{ width: usagePct(m) + '%' }"
          />
        </div>
      </div>
    </div>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <div
      v-for="p in PLANS"
      :key="p.id"
      class="flex flex-col gap-4 rounded-lg border bg-card p-5"
      :class="
        isCurrent(p.id) ? 'border-primary/40 ring-1 ring-primary/30' : ''
      "
    >
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-base font-semibold tracking-tight">{{ p.name }}</h3>
          <span
            v-if="isCurrent(p.id)"
            class="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
          >
            Current
          </span>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">{{ p.tagline }}</p>
      </div>

      <div class="flex items-baseline gap-1">
        <span class="text-2xl font-semibold tracking-tight">{{ p.price }}</span>
        <span class="text-xs text-muted-foreground">{{ p.period }}</span>
      </div>

      <ul class="flex flex-col gap-2 text-sm">
        <li v-for="f in p.features" :key="f" class="flex items-start gap-2">
          <Icon name="check" :size="14" class="mt-0.5 shrink-0 text-primary" />
          <span>{{ f }}</span>
        </li>
      </ul>

      <div class="mt-auto pt-2">
        <Button
          :variant="
            isCurrent(p.id)
              ? 'outline'
              : p.id === 'team'
                ? 'default'
                : 'outline'
          "
          size="sm"
          class="w-full"
          :disabled="isCurrent(p.id)"
          @click="change(p.id)"
        >
          {{ actionLabel(p.id) }}
        </Button>
      </div>
    </div>
  </div>

  <div
    v-if="!isFree"
    class="mt-6 flex items-center justify-between rounded-lg border bg-card p-4"
  >
    <div class="text-sm">
      <div class="font-medium">Next invoice</div>
      <div class="text-xs text-muted-foreground">
        {{ activeSeats }} {{ activeSeats === 1 ? "seat" : "seats" }} × ${{
          PRICE_PER_SEAT
        }}
      </div>
    </div>
    <div class="text-right">
      <div class="font-mono text-base font-semibold">
        ${{ monthlyTotal }}.00
      </div>
      <div class="text-xs text-muted-foreground">
        on {{ nextInvoiceDate }}
      </div>
    </div>
  </div>

  <p class="mt-4 text-xs text-muted-foreground">
    Payments will be processed by Stripe. No cards on file yet — billing wires
    up before public launch.
  </p>
</template>
