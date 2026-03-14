"use client";
import React from "react";
import { 
  Button, 
  Input, 
  Card, 
  CardHeader, 
  CardContent, 
  Typography, 
  Badge, 
  Stack, 
  Container 
} from "@/components/ui";
import { MdSend, MdPerson, MdCheckCircle } from "react-icons/md";

export default function TestComponentsPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <Container maxWidth="lg">
        <Stack spacing={8}>
          {/* Header */}
          <Stack spacing={2} align="center">
            <Typography variant="h1" color="secondary">PAU InterConnect Design System</Typography>
            <Typography variant="body1" color="muted">Explore our custom generic components.</Typography>
          </Stack>

          {/* Buttons */}
          <Card>
            <CardHeader>
              <Typography variant="h4">Buttons</Typography>
            </CardHeader>
            <CardContent>
              <Stack direction="row" spacing={4} align="center" className="flex-wrap">
                <Button>Primary Solid</Button>
                <Button colorType="secondary">Secondary Solid</Button>
                <Button variant="outline">Primary Outline</Button>
                <Button variant="ghost" colorType="danger">Danger Ghost</Button>
                <Button isLoading>Loading</Button>
                <Button leftIcon={<MdSend />}>With Icon</Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <Typography variant="h4">Typography</Typography>
            </CardHeader>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h1">Heading 1</Typography>
                <Typography variant="h2">Heading 2</Typography>
                <Typography variant="h3">Heading 3</Typography>
                <Typography variant="body1">Body 1: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sapiens autem quatere non vult.</Typography>
                <Typography variant="body2" color="muted">Body 2 (Muted): More detail here, but slightly less prominent.</Typography>
                <Typography variant="caption">Caption: Tracking the progress.</Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Badges and Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Typography variant="h4">Badges</Typography>
              </CardHeader>
              <CardContent>
                <Stack direction="row" spacing={3} className="flex-wrap">
                  <Badge>New</Badge>
                  <Badge variant="secondary">In Progress</Badge>
                  <Badge variant="success">Completed</Badge>
                  <Badge variant="warning">Alert</Badge>
                  <Badge variant="error">Failed</Badge>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Typography variant="h4">Inputs</Typography>
              </CardHeader>
              <CardContent>
                <Stack spacing={4}>
                  <Input label="Email Address" placeholder="Enter your email" type="email" />
                  <Input label="Full Name" placeholder="John Doe" leftIcon={<MdPerson />} />
                  <Input label="Password" type="password" error="Password is too short" />
                </Stack>
              </CardContent>
            </Card>
          </div>

          {/* Cards */}
          <Stack spacing={4}>
            <Typography variant="h3">Cards with Hover effects</Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} hoverable>
                  <CardContent>
                    <Stack spacing={4}>
                      <div className="w-12 h-12 rounded-xl bg-[#667eea]/10 flex items-center justify-center text-[#667eea]">
                        <MdCheckCircle size={24} />
                      </div>
                      <Typography variant="h5">Feature Item {i}</Typography>
                      <Typography variant="body2" color="muted">
                        Description of this amazing feature that you built with custom components.
                      </Typography>
                      <Button variant="link" colorType="secondary" className="justify-start">Learn more</Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}
