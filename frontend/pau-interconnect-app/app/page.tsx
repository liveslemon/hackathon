"use client";
import React from "react";
import { 
  Button, 
  Container, 
  Typography, 
  Stack, 
  Card,
  Badge
} from "@/components/ui";
import { motion } from "motion/react";
import { 
  MdWork, MdTrendingUp, MdStar, MdCheckCircle, 
  MdArrowForward, MdOutlineSettings, MdBusiness, MdPeople
} from "react-icons/md";

export default function LandingPage() {
  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-900 overflow-x-hidden">
      {/* Navbar Minimalist */}
      <nav className="px-4 sm:px-6 lg:px-20 py-4 sm:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <a href="/" className="flex items-center gap-2 sm:gap-3 no-underline">
          <img src="/favicon.ico" alt="PAU Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg" />
          <Typography variant="h6" weight="bold" color="secondary" className="text-sm sm:text-base">
            PAU InterConnect
          </Typography>
        </a>
        
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button variant="ghost" href="/login/admin" className="hidden lg:inline-flex text-xs sm:text-sm px-2 sm:px-4">Admin</Button>
          <Button variant="outline" href="/login/employer" className="text-xs sm:text-sm px-2 sm:px-4">Employer</Button>
          <Button href="/login/student" className="text-xs sm:text-sm px-2 sm:px-4">Student</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-32 md:pt-40 pb-20 md:pb-40" 
           style={{ 
             backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)', 
             backgroundSize: '24px 24px' 
           }}>
         <Container maxWidth="md" className="text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
               <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl mb-10">
                   <MdBusiness size={32} color="var(--brand)" />
               </div>
               <Typography variant="h1" className="mb-6 leading-tight">
                 Internships and Recruiting<br/>
                 <span className="text-slate-400">powered by AI matching</span>
               </Typography>
               <Typography variant="h6" weight="normal" color="muted" className="mb-12">
                 Students tailor CVs instantly. Employers find top talent accurately.
               </Typography>
               <Button size="lg" href="/onboarding">
                 Get started
               </Button>
            </motion.div>
         </Container>

         {/* Floating Elements */}
         <div className="hidden lg:block">
            {/* Top Left Note */}
            <motion.div 
               initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0, y: [0, -15, 0] }} 
               transition={{ opacity: { duration: 1 }, x: { duration: 1 }, y: { repeat: Infinity, duration: 5, ease: "easeInOut" } }}
               className="absolute top-[15%] left-[8%] z-5"
            >
               <div className="w-[220px] h-[200px] bg-[#fef3c7] p-6 -rotate-6 shadow-xl rounded-xl relative">
                  <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-4 shadow-inner" />
                  <Typography variant="body2" className="text-[#451a03] leading-relaxed font-serif">
                     Upload your CV to see how well you match with top tech roles at PAU instantly.
                  </Typography>
                  <div className="absolute -bottom-5 -left-5 w-[70px] h-[70px] rounded-2xl bg-white shadow-lg flex items-center justify-center rotate-12">
                     <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                        <MdCheckCircle size={24} />
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* Top Right Match Score */}
            <motion.div 
               initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0, y: [0, -20, 0] }} 
               transition={{ opacity: { duration: 1 }, x: { duration: 1 }, y: { repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 } }}
               className="absolute top-[12%] right-[10%] z-5"
            >
               <Card className="w-[260px] p-6 rotate-6 border-t-[20px] border-emerald-500 relative">
                  <Typography variant="h6" weight="bold" className="mb-4 text-emerald-700">AI Match</Typography>
                  <Typography variant="body2" weight="bold">Frontend Engineer</Typography>
                  <Typography variant="caption" color="muted" className="block mb-4 italic">Missing: Tailwind, Next.js</Typography>
                  <Badge variant="success">92% Match Score</Badge>
                  <div className="absolute top-10 -left-8 w-[70px] h-[70px] rounded-full bg-white shadow-lg flex items-center justify-center">
                     <div className="w-12 h-12 rounded-full border-2 border-slate-900 relative">
                        {/* Clock hands */}
                        <div className="absolute top-[22px] left-[23px] w-0.5 h-3 bg-red-500 origin-top rotate-[135deg]" />
                        <div className="absolute top-[12px] left-[23px] w-0.5 h-3 bg-slate-900" />
                     </div>
                  </div>
               </Card>
            </motion.div>

            {/* Bottom Left Applications */}
            <motion.div 
               initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: [0, -12, 0] }} 
               transition={{ opacity: { duration: 1, delay: 0.2 }, y: { repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 } }}
               className="absolute bottom-[10%] left-[12%] z-5"
            >
               <Card className="w-[300px] p-6 -rotate-2 border-t-[20px] border-brand">
                  <Typography variant="h6" weight="bold" className="mb-6">Employer Queue</Typography>
                  <Stack spacing={6}>
                     <div>
                        <Stack direction="row" align="center" spacing={2} className="mb-2">
                           <div className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">14</div>
                           <Typography variant="body2" weight="bold">Pending Applications</Typography>
                        </Stack>
                        <Stack direction="row" align="center" spacing={4}>
                           <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="w-3/5 h-full bg-red-500" />
                           </div>
                           <Typography variant="caption" weight="bold">60% Needs Review</Typography>
                        </Stack>
                     </div>
                     <div>
                        <Stack direction="row" align="center" spacing={2} className="mb-2">
                           <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                           <Typography variant="body2" weight="bold">Schedule Interviews</Typography>
                        </Stack>
                        <Stack direction="row" align="center" spacing={4}>
                           <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="w-full h-full bg-emerald-500" />
                           </div>
                           <Typography variant="caption" weight="bold">100%</Typography>
                        </Stack>
                     </div>
                  </Stack>
               </Card>
            </motion.div>

            {/* Bottom Right Admin Stats */}
            <motion.div 
               initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: [0, -18, 0] }} 
               transition={{ opacity: { duration: 1, delay: 0.4 }, y: { repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1.5 } }}
               className="absolute bottom-[15%] right-[12%] z-5"
            >
               <Card className="w-[320px] p-6 border-t-[20px] border-brand-secondary">
                  <Typography variant="body1" weight="bold" className="mb-4">Live Platform Stats</Typography>
                  <div className="flex justify-center -space-x-4 mt-8 mb-2">
                     <div className="w-[70px] h-[70px] rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center relative z-30">
                        {/* Faux M icon */}
                        <div className="flex items-end">
                           <div className="w-2 h-6 bg-[#4285F4] rounded-l-md"/>
                           <div className="w-3.5 h-2 bg-[#EA4335]"/>
                           <div className="w-3.5 h-2 bg-[#FBBC05]"/>
                           <div className="w-2 h-6 bg-[#34A853] rounded-r-md"/>
                        </div>
                     </div>
                     <div className="w-[70px] h-[70px] rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center relative z-20 -translate-y-4">
                        {/* Faux Slack icon */}
                        <div className="relative w-8 h-8">
                           <div className="absolute top-0 left-[18px] w-2 h-4.5 bg-[#E01E5A] rounded-full"/>
                           <div className="absolute top-[14px] left-0 w-4.5 h-2 bg-[#36C5F0] rounded-full"/>
                           <div className="absolute bottom-0 right-[18px] w-2 h-4.5 bg-[#2EB67D] rounded-full"/>
                           <div className="absolute top-[14px] right-0 w-4.5 h-2 bg-[#ECB22E] rounded-full"/>
                        </div>
                     </div>
                     <div className="w-[70px] h-[70px] rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center relative z-10 translate-y-3">
                        {/* Faux Calendar icon */}
                        <div className="flex flex-col items-center">
                           <div className="w-9 h-3 bg-[#4285F4] rounded-t-md"/>
                           <div className="w-9 h-6 bg-white rounded-b-md border border-slate-200 border-t-0 flex items-center justify-center">
                              <Typography variant="body2" weight="bold" className="text-slate-800">31</Typography>
                           </div>
                        </div>
                     </div>
                  </div>
               </Card>
            </motion.div>
         </div>
      </div>

      {/* Joint gradient container for Continuous Flow */}
      <div className="bg-gradient-to-br from-brand to-brand-secondary">
         {/* Deep Green CTA Banner (Grid overlay) */}
         <div className="pt-24 pb-24 text-center" 
              style={{ 
                backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "40px 40px"
              }}>
            <Container maxWidth="md">
               <Typography variant="h2" color="white" className="mb-4">
                  From Application to Placement in Days
               </Typography>
               <Typography variant="body1" className="text-white/70 mb-10 max-w-[600px] mx-auto leading-relaxed">
                  Accelerate your hiring with our technology. Reduce downtime and optimize headcount. Get a special offer now!
               </Typography>
               <Button size="lg" colorType="secondary" href="/onboarding/employer" className="bg-white text-brand hover:bg-slate-50">
                  Work With Us
               </Button>
            </Container>
         </div>

         {/* Services Grid */}
         <div className="pt-8 pb-32">
         <Container maxWidth="lg">
            <Typography variant="h3" color="white" weight="bold" className="text-center mb-2">
               What PAU Interconnect Does
            </Typography>
            <Typography variant="body1" className="text-center text-white/70 mb-16">
               A complete pipeline from student signup to employer placement.
            </Typography>
            
            <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
               {[
                  { title: "Student CV Upload & Tailoring", desc: "Students upload their CV, which is parsed by AI. They can instantly tailor it per internship role with a single click.", icon: <MdWork /> },
                  { title: "AI Match Scoring", desc: "Each application is scored by AI against job requirements, surfacing matched skills and gaps so employers can decide faster.", icon: <MdTrendingUp /> },
                  { title: "Employer Application Review", desc: "Employers log in to see ranked applicants, review CV scores, and accept or reject candidates directly from their dashboard.", icon: <MdBusiness /> },
               ].map((svc, i) => (
                  <Card key={i} className="flex-1 p-8">
                     <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center mb-6 text-white text-2xl">
                        {svc.icon}
                     </div>
                     <Typography variant="h6" weight="bold" className="mb-3">{svc.title}</Typography>
                     <Typography variant="body2" color="muted" className="leading-relaxed">
                        {svc.desc}
                     </Typography>
                  </Card>
               ))}
            </div>
         </Container>
      </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] text-white pt-24 pb-10">
         <Container maxWidth="lg">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 mb-20">
               <div className="md:col-span-4">
                  <Stack direction="row" align="center" spacing={3} className="mb-8">
                     <div className="w-7 h-7 rounded-full bg-brand-secondary relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-brand" />
                     </div>
                     <Typography variant="h6" weight="bold">
                        PAU Interconnect
                     </Typography>
                  </Stack>
                  <Typography variant="body2" className="text-white/60 leading-relaxed max-w-[280px]">
                     Our solutions make placements faster and cheaper. Contact us for more information.
                  </Typography>
               </div>
               <div className="col-span-6 md:col-span-2">
                  <Typography weight="bold" className="mb-8 text-white">Company</Typography>
                  <Stack spacing={4} className="text-white/60 text-sm">
                     <p className="hover:text-white cursor-pointer transition-colors">About Us</p>
                     <p className="hover:text-white cursor-pointer transition-colors">Customers</p>
                     <p className="hover:text-white cursor-pointer transition-colors">Newsroom</p>
                     <p className="hover:text-white cursor-pointer transition-colors">Events</p>
                  </Stack>
               </div>
               <div className="col-span-6 md:col-span-2">
                  <Typography weight="bold" className="mb-8 text-white">Industries</Typography>
                  <Stack spacing={4} className="text-white/60 text-sm">
                     <p className="hover:text-white cursor-pointer transition-colors">Finance Technology</p>
                     <p className="hover:text-white cursor-pointer transition-colors">Software Dev</p>
                     <p className="hover:text-white cursor-pointer transition-colors">Data Science</p>
                     <p className="hover:text-white cursor-pointer transition-colors">Cybersecurity</p>
                  </Stack>
               </div>
               <div className="md:col-span-4">
                  <Typography weight="bold" className="mb-8 text-white">Get In Touch</Typography>
                  <Typography variant="body2" className="text-white/60 mb-8">
                     hello@pauinterconnect.edu
                  </Typography>
                  <Stack direction="row" spacing={2}>
                     <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-brand-secondary hover:text-brand transition-all cursor-pointer">
                        <MdWork size={20} />
                     </div>
                     <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-brand-secondary hover:text-brand transition-all cursor-pointer">
                        <MdTrendingUp size={20} />
                     </div>
                  </Stack>
               </div>
            </div>
            
            <div className="border-t border-white/10 pt-10 flex flex-col md:row justify-between items-center gap-4">
               <Typography variant="body2" className="text-white/40">
                  © 2024 PAU Interconnect, All rights reserved
               </Typography>
               <Stack direction="row" spacing={10} className="text-white/40">
                  <Typography variant="body2" className="hover:text-white cursor-pointer transition-colors">Terms & Conditions</Typography>
                  <Typography variant="body2" className="hover:text-white cursor-pointer transition-colors">Privacy Policy</Typography>
               </Stack>
            </div>
         </Container>
      </footer>
    </div>
  );
}

