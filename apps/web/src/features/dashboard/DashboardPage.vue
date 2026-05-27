<script setup lang="ts">
import { Card, CardContent, Skeleton } from "@pinlay/design";
import PageHeader from "@/shared/components/PageHeader.vue";

const kpis = ["Total pins", "Open", "Critical", "Avg time-to-fix"];
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      badge="v1"
      subtitle="Analytics across your annotation activity."
    />
    <div class="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="k in kpis" :key="k">
        <CardContent class="grid gap-2 p-5">
          <span class="text-xs text-muted-foreground">{{ k }}</span>
          <Skeleton class="h-7 w-16" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
