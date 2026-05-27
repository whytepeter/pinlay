<script setup lang="ts">
import { ref } from "vue";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Icon,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@pinlayer/design";

const theme = ref(document.documentElement.dataset.theme ?? "light");
function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = theme.value;
}

const notify = ref(true);
const agree = ref<boolean | "indeterminate">(false);
const severity = ref("high");
const title = ref("");
const note = ref("");
const showResolved = ref(true);
const sortBy = ref("severity");
</script>

<template>
  <TooltipProvider>
    <div class="min-h-screen bg-background font-sans text-foreground">
      <header
        class="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur"
      >
        <div class="flex items-center gap-2">
          <Icon name="map-pin" :size="20" class="text-primary" />
          <span class="text-[15px] font-semibold tracking-tight">pinLayer</span>
          <Badge variant="secondary">component gallery</Badge>
        </div>
        <Button variant="ghost" size="icon" @click="toggleTheme">
          <Icon :name="theme === 'light' ? 'moon' : 'sun'" :size="16" />
        </Button>
      </header>

      <div class="mx-auto grid max-w-[1000px] gap-6 p-8">
        <div class="flex flex-col gap-1">
          <h1 class="text-xl font-semibold tracking-tight">Components</h1>
          <p class="text-sm text-muted-foreground">
            Every @pinlayer/design primitive — shadcn-vue + Tailwind v4 + lucide.
          </p>
        </div>

        <!-- BUTTONS -->
        <Card>
          <CardHeader>
            <CardTitle>Button</CardTitle>
            <CardDescription>Variants, sizes, states.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" variant="outline"
                ><Icon name="plus" :size="16"
              /></Button>
              <Button disabled>Disabled</Button>
              <Button><Icon name="check" :size="16" /> With icon</Button>
            </div>
          </CardContent>
        </Card>

        <!-- BADGE -->
        <Card>
          <CardHeader>
            <CardTitle>Badge</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge><Icon name="check" :size="12" /> Synced</Badge>
          </CardContent>
        </Card>

        <!-- INPUTS -->
        <Card>
          <CardHeader>
            <CardTitle>Input · Label · Textarea</CardTitle>
          </CardHeader>
          <CardContent class="grid max-w-md gap-4">
            <div class="grid gap-1.5">
              <Label for="title">Session title</Label>
              <Input id="title" v-model="title" placeholder="Checkout review" />
            </div>
            <div class="grid gap-1.5">
              <Label for="disabled">Disabled</Label>
              <Input id="disabled" placeholder="Can't type here" disabled />
            </div>
            <div class="grid gap-1.5">
              <Label for="note">Note</Label>
              <Textarea id="note" v-model="note" placeholder="What's wrong?" />
            </div>
          </CardContent>
        </Card>

        <!-- SELECTION CONTROLS -->
        <Card>
          <CardHeader>
            <CardTitle>Select · Switch · Checkbox</CardTitle>
          </CardHeader>
          <CardContent class="grid max-w-md gap-4">
            <div class="grid gap-1.5">
              <Label>Severity</Label>
              <Select v-model="severity">
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="flex items-center gap-2">
              <Switch id="notify" v-model="notify" />
              <Label for="notify">Email me on new pins</Label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox id="agree" v-model="agree" />
              <Label for="agree">I understand</Label>
            </div>
          </CardContent>
        </Card>

        <!-- DISPLAY -->
        <Card>
          <CardHeader>
            <CardTitle>Avatar · Separator · Skeleton</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="flex items-center gap-3">
              <Avatar><AvatarFallback>BE</AvatarFallback></Avatar>
              <Avatar><AvatarFallback>MV</AvatarFallback></Avatar>
              <Avatar><AvatarFallback>TP</AvatarFallback></Avatar>
              <Separator orientation="vertical" class="h-6" />
              <span class="text-sm text-muted-foreground">3 reviewers</span>
            </div>
            <Separator />
            <div class="grid gap-2">
              <Skeleton class="h-4 w-2/3" />
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-24 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>

        <!-- CARD (composed) -->
        <Card>
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>Header, content, and footer.</CardDescription>
          </CardHeader>
          <CardContent class="text-sm text-muted-foreground">
            Cards use <code class="text-foreground">bg-card</code> +
            <code class="text-foreground">border-border</code>. This whole gallery
            is built from them.
          </CardContent>
          <CardFooter class="gap-2">
            <Button size="sm">Save</Button>
            <Button size="sm" variant="ghost">Cancel</Button>
          </CardFooter>
        </Card>

        <!-- OVERLAYS -->
        <Card>
          <CardHeader>
            <CardTitle>Dialog · Popover · Dropdown · Tooltip</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger as-child><Button>Open dialog</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New session</DialogTitle>
                  <DialogDescription
                    >Start annotating a live page.</DialogDescription
                  >
                </DialogHeader>
                <Input placeholder="https://app.example.com" />
                <DialogFooter>
                  <Button variant="ghost">Cancel</Button>
                  <Button>Launch</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger as-child>
                <Button variant="outline"
                  >Popover <Icon name="chevron-down" :size="14"
                /></Button>
              </PopoverTrigger>
              <PopoverContent class="grid gap-2">
                <p class="text-sm font-medium">Quick filter</p>
                <p class="text-sm text-muted-foreground">
                  Popovers float over content with a focus trap.
                </p>
                <Button size="sm" class="justify-self-start">Apply</Button>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline"
                  >Menu <Icon name="chevron-down" :size="14"
                /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="w-52">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Assign</DropdownMenuItem>
                <DropdownMenuItem>Resolve</DropdownMenuItem>
                <DropdownMenuCheckboxItem v-model="showResolved">
                  Show resolved
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup v-model="sortBy">
                  <DropdownMenuRadioItem value="severity"
                    >Severity</DropdownMenuRadioItem
                  >
                  <DropdownMenuRadioItem value="recent"
                    >Most recent</DropdownMenuRadioItem
                  >
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Send to…</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Linear</DropdownMenuItem>
                    <DropdownMenuItem>Jira</DropdownMenuItem>
                    <DropdownMenuItem>GitHub</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="text-destructive"
                  >Delete</DropdownMenuItem
                >
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon"
                  ><Icon name="bell" :size="16"
                /></Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        <!-- TABS -->
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs default-value="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="pins">Pins</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent
                value="overview"
                class="pt-3 text-sm text-muted-foreground"
                >Session summary and rollups.</TabsContent
              >
              <TabsContent
                value="pins"
                class="pt-3 text-sm text-muted-foreground"
                >The pins captured on this page.</TabsContent
              >
              <TabsContent
                value="activity"
                class="pt-3 text-sm text-muted-foreground"
                >Comments, syncs, status changes.</TabsContent
              >
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  </TooltipProvider>
</template>
