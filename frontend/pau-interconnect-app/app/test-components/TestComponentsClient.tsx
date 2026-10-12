"use client";
import React, { useState } from "react";
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Badge,
  Stack,
  Container,
  EmptyState,
  PageHeader,
  StatCard,
  Tabs,
  DropdownMenu,
  Tooltip,
  Avatar,
  ProgressBar,
  ProgressRing,
  ConfirmDialog,
  Drawer,
  DataTable,
  StatusPill,
} from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Send,
  User,
  CheckCircle,
  Briefcase,
  FileText,
  MoreVertical,
  Trash2,
  Edit,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";

export default function TestComponentsClient() {
  const [activeTab, setActiveTab] = useState("buttons");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const sampleTableData = [
    { id: "1", role: "Software Engineer Intern", company: "Paystack", location: "Lagos, NG", status: "offered" },
    { id: "2", role: "Product Design Intern", company: "Flutterwave", location: "Remote", status: "shortlisted" },
    { id: "3", role: "Data Analyst Trainee", company: "Kuda Bank", location: "Lagos, NG", status: "applied" },
    { id: "4", role: "Cybersecurity Analyst", company: "Interswitch", location: "Lagos, NG", status: "rejected" },
  ];

  return (
    <div className="bg-background text-fg min-h-screen py-10 transition-colors">
      <Container maxWidth="xl">
        <Stack spacing={8}>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-3">
                <Typography variant="h2" weight="extrabold" color="secondary">
                  PAU InterConnect
                </Typography>
                <Badge variant="primary" size="lg">Living Style Guide</Badge>
              </div>
              <Typography variant="body1" color="muted" className="mt-1">
                Visual testing sandbox & component library across Light and Dark modes.
              </Typography>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-fg-muted">Active theme:</span>
              <ThemeToggle variant="segmented" />
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs
            variant="pills"
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "buttons", label: "Buttons & Inputs", icon: <Send className="w-4 h-4" /> },
              { id: "cards", label: "Surfaces & Stats", icon: <Award className="w-4 h-4" /> },
              { id: "status", label: "Status & Badges", icon: <CheckCircle className="w-4 h-4" /> },
              { id: "navigation", label: "Navigation & Menus", icon: <Briefcase className="w-4 h-4" /> },
              { id: "overlays", label: "Modals & Drawers", icon: <Sparkles className="w-4 h-4" /> },
              { id: "data", label: "Data Tables", icon: <FileText className="w-4 h-4" /> },
            ]}
          />

          {/* Tab 1: Buttons & Inputs */}
          {activeTab === "buttons" && (
            <Stack spacing={6}>
              <Card>
                <CardHeader>
                  <Typography variant="h4" weight="bold">Buttons (Tokens & Sizes)</Typography>
                </CardHeader>
                <CardContent>
                  <Stack spacing={4}>
                    <div>
                      <Typography variant="caption" color="muted" className="mb-2 block">Variants</Typography>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="solid" colorType="primary">Brand Solid</Button>
                        <Button variant="solid" colorType="secondary">Violet Solid</Button>
                        <Button variant="solid" colorType="success">Success Solid</Button>
                        <Button variant="solid" colorType="danger">Danger Solid</Button>
                        <Button variant="subtle" colorType="primary">Brand Subtle</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Link Style</Button>
                        <Button isLoading>Loading State</Button>
                        <Button leftIcon={<Send className="w-4 h-4" />}>With Left Icon</Button>
                      </div>
                    </div>

                    <div>
                      <Typography variant="caption" color="muted" className="mb-2 block">Touch Target Scale</Typography>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button size="xs">XS (32px)</Button>
                        <Button size="sm">SM (36px)</Button>
                        <Button size="md">MD (42px)</Button>
                        <Button size="lg">LG (48px)</Button>
                        <Button size="xl">XL (56px)</Button>
                      </div>
                    </div>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Typography variant="h4" weight="bold">Form Controls (Inputs, Select, Textarea)</Typography>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Student Matric Number"
                      placeholder="e.g. 210102030"
                      leftIcon={<User className="w-4 h-4" />}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      helperText="Must match your Pan-Atlantic University student ID."
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="student@pau.edu.ng"
                      error={inputValue.length > 0 && !inputValue.includes("@") ? "Invalid institutional email domain" : undefined}
                    />
                    <Select
                      label="School / Department"
                      options={[
                        { value: "sst", label: "School of Science and Technology (SST)" },
                        { value: "smc", label: "School of Media and Communication (SMC)" },
                        { value: "msb", label: "School of Management and Social Sciences (SMSS)" },
                      ]}
                      defaultValue="sst"
                    />
                    <Textarea
                      label="Weekly Work Summary (Logbook)"
                      placeholder="Describe the tasks, challenges, and tools used during this week..."
                      rows={3}
                      helperText="Minimum 50 words recommended."
                    />
                  </div>
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Tab 2: Surfaces & Stats */}
          {activeTab === "cards" && (
            <Stack spacing={6}>
              <PageHeader
                title="Career Dashboard Overview"
                description="Monitor student placement metrics, ATS CV parsing scores, and SIWES approval rates."
                badge={<Badge variant="primary">2026 Cohort</Badge>}
                actions={
                  <Button variant="solid" colorType="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
                    Export Report
                  </Button>
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Match Rate"
                  value="94%"
                  change={{ value: "+4.2%", trend: "up" }}
                  icon={<Sparkles className="w-5 h-5" />}
                  description="Target alignment"
                />
                <StatCard
                  label="Active Applications"
                  value="12"
                  change={{ value: "3 offers", trend: "up" }}
                  icon={<Briefcase className="w-5 h-5" />}
                  description="Across 8 top tech firms"
                />
                <StatCard
                  label="SIWES Logbook Weeks"
                  value="16 / 24"
                  change={{ value: "On track", trend: "neutral" }}
                  icon={<FileText className="w-5 h-5" />}
                  description="Verified by supervisor"
                />
                <StatCard
                  label="CV Health Score"
                  value="88"
                  change={{ value: "-2 pts", trend: "down" }}
                  icon={<TrendingUp className="w-5 h-5" />}
                  description="ATS keyword strength"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="surface" hoverable>
                  <CardHeader>
                    <Typography variant="h5" weight="bold">Surface Card</Typography>
                  </CardHeader>
                  <CardContent>
                    <Typography variant="body2" color="muted">
                      Standard background elevation token (<code>bg-surface</code>) with soft borders and hover lift.
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="raised" hoverable>
                  <CardHeader>
                    <Typography variant="h5" weight="bold">Raised Card</Typography>
                  </CardHeader>
                  <CardContent>
                    <Typography variant="body2" color="muted">
                      Higher elevation token (<code>bg-surface-raised</code>) ideal for floating widgets and modals.
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="sunken">
                  <CardHeader>
                    <Typography variant="h5" weight="bold">Sunken Card</Typography>
                  </CardHeader>
                  <CardContent>
                    <Typography variant="body2" color="muted">
                      Recessed background well token (<code>bg-surface-sunken</code>) for secondary info panels.
                    </Typography>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <Typography variant="h5" weight="bold">Linear Progress Bar</Typography>
                  </CardHeader>
                  <CardContent>
                    <Stack spacing={4}>
                      <ProgressBar value={72} variant="brand" showLabel />
                      <ProgressBar value={95} variant="success" showLabel />
                      <ProgressBar value={40} variant="gradient" showLabel />
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Typography variant="h5" weight="bold">Radial Progress Ring</Typography>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-around">
                      <ProgressRing value={85} variant="brand" size={72}>85%</ProgressRing>
                      <ProgressRing value={100} variant="success" size={72}>100%</ProgressRing>
                      <ProgressRing value={45} variant="warning" size={72}>45%</ProgressRing>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Stack>
          )}

          {/* Tab 3: Status & Badges */}
          {activeTab === "status" && (
            <Stack spacing={6}>
              <Card>
                <CardHeader>
                  <Typography variant="h4" weight="bold">Unified StatusPill (All Lifecycle States)</Typography>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Typography variant="caption" color="muted" className="mb-2 block">Application Pipeline Stages</Typography>
                      <div className="flex flex-wrap gap-2.5">
                        <StatusPill status="applied" />
                        <StatusPill status="reviewed" />
                        <StatusPill status="interview" />
                        <StatusPill status="shortlisted" />
                        <StatusPill status="offered" />
                        <StatusPill status="accepted" />
                        <StatusPill status="rejected" />
                        <StatusPill status="withdrawn" />
                        <StatusPill status="pending" />
                      </div>
                    </div>

                    <div>
                      <Typography variant="caption" color="muted" className="mb-2 block">SIWES Logbook Statuses</Typography>
                      <div className="flex flex-wrap gap-2.5">
                        <StatusPill status="draft" />
                        <StatusPill status="submitted" />
                        <StatusPill status="approved" />
                        <StatusPill status="needs_revision" />
                        <StatusPill status="rejected" />
                      </div>
                    </div>

                    <div>
                      <Typography variant="caption" color="muted" className="mb-2 block">Internship Postings</Typography>
                      <div className="flex flex-wrap gap-2.5">
                        <StatusPill status="open" />
                        <StatusPill status="closed" />
                        <StatusPill status="archived" />
                        <StatusPill status="active" />
                        <StatusPill status="completed" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Typography variant="h4" weight="bold">Avatars & Badges</Typography>
                </CardHeader>
                <CardContent>
                  <Stack spacing={4}>
                    <div>
                      <Typography variant="caption" color="muted" className="mb-2 block">Avatars</Typography>
                      <div className="flex items-center gap-3">
                        <Avatar name="Chinedu Okeke" size="xs" />
                        <Avatar name="Amina Yusuf" size="sm" />
                        <Avatar name="Babatunde Adeleke" size="md" />
                        <Avatar name="Pan Atlantic" size="lg" />
                        <Avatar name="David West" size="xl" />
                      </div>
                    </div>

                    <div>
                      <Typography variant="caption" color="muted" className="mb-2 block">Badges Palette</Typography>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="primary">Brand Indigo</Badge>
                        <Badge variant="secondary">Brand Violet</Badge>
                        <Badge variant="success">Success</Badge>
                        <Badge variant="warning">Warning</Badge>
                        <Badge variant="error">Danger</Badge>
                        <Badge variant="info">Information</Badge>
                        <Badge variant="neutral">Neutral Slate</Badge>
                        <Badge variant="pink">Pink Accent</Badge>
                      </div>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Tab 4: Navigation & Menus */}
          {activeTab === "navigation" && (
            <Stack spacing={6}>
              <Card>
                <CardHeader>
                  <Typography variant="h4" weight="bold">Dropdown Menus & Tooltips</Typography>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-6">
                    <DropdownMenu
                      trigger={
                        <Button variant="outline" rightIcon={<MoreVertical className="w-4 h-4" />}>
                          Options Menu
                        </Button>
                      }
                      items={[
                        { id: "1", label: "Edit Internship", icon: <Edit className="w-4 h-4" /> },
                        { id: "2", label: "Duplicate Posting", icon: <FileText className="w-4 h-4" /> },
                        { id: "d1", label: "", divider: true },
                        { id: "3", label: "Delete Permanently", icon: <Trash2 className="w-4 h-4" />, danger: true },
                      ]}
                    />

                    <Tooltip content="Verified by PAU Careers Office">
                      <Button variant="subtle" colorType="primary">
                        Hover for Tooltip
                      </Button>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>

              <EmptyState
                icon={<Briefcase className="w-8 h-8" />}
                title="No active internship applications yet"
                description="Explore top employer opportunities curated for Pan-Atlantic University engineering and media students."
                action={{ label: "Browse Internships", onClick: () => {} }}
                secondaryAction={{ label: "Upload CV", onClick: () => {} }}
              />
            </Stack>
          )}

          {/* Tab 5: Overlays & Drawers */}
          {activeTab === "overlays" && (
            <Card>
              <CardHeader>
                <Typography variant="h4" weight="bold">Modals, Confirm Dialogs & Drawers</Typography>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="solid"
                    colorType="danger"
                    onClick={() => setIsConfirmOpen(true)}
                  >
                    Open Confirm Dialog
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Open Mobile Drawer / Sheet
                  </Button>
                </div>

                <ConfirmDialog
                  isOpen={isConfirmOpen}
                  onClose={() => setIsConfirmOpen(false)}
                  onConfirm={() => {
                    setIsConfirmOpen(false);
                  }}
                  title="Withdraw Application?"
                  message="Are you sure you want to withdraw your application for Software Engineer Intern at Paystack? This action cannot be reversed."
                  confirmLabel="Yes, Withdraw"
                  variant="danger"
                />

                <Drawer
                  isOpen={isDrawerOpen}
                  onClose={() => setIsDrawerOpen(false)}
                  title="Filter Opportunities"
                  side="right"
                >
                  <Stack spacing={4}>
                    <Typography variant="body2" color="muted">
                      Use drawers for responsive mobile filters, slide-over details, and drawer navigation.
                    </Typography>
                    <Select
                      label="Industry"
                      options={[
                        { value: "fintech", label: "Fintech" },
                        { value: "media", label: "Media & Broadcasting" },
                        { value: "consulting", label: "Management Consulting" },
                      ]}
                    />
                    <Button
                      variant="solid"
                      colorType="primary"
                      className="w-full mt-4"
                      onClick={() => setIsDrawerOpen(false)}
                    >
                      Apply Filters
                    </Button>
                  </Stack>
                </Drawer>
              </CardContent>
            </Card>
          )}

          {/* Tab 6: Data Tables */}
          {activeTab === "data" && (
            <Card>
              <CardHeader>
                <Typography variant="h4" weight="bold">Responsive DataTable (With Mobile Card Fallback)</Typography>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={sampleTableData}
                  keyExtractor={(item) => item.id}
                  columns={[
                    { key: "role", header: "Internship Role", sortable: true, render: (i) => <span className="font-semibold">{i.role}</span> },
                    { key: "company", header: "Company", sortable: true },
                    { key: "location", header: "Location" },
                    { key: "status", header: "Status", render: (i) => <StatusPill status={i.status} size="sm" /> },
                  ]}
                  renderMobileCard={(i) => (
                    <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{i.role}</span>
                        <StatusPill status={i.status} size="sm" />
                      </div>
                      <div className="text-xs text-fg-muted flex items-center justify-between">
                        <span>{i.company}</span>
                        <span>{i.location}</span>
                      </div>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>
    </div>
  );
}
