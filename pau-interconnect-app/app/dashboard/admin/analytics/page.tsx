import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Stack,
  LinearProgress
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { FaBriefcase, FaUsers, FaChartLine } from "react-icons/fa";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const stats = [
  { title: "Total Internships", value: 8, icon: <FaBriefcase />, color: "#1976d2" },
  { title: "Total Applications", value: 0, icon: <FaUsers />, color: "#1976d2" },
  { title: "Avg Applications", value: "0.0", icon: <FaChartLine />, color: "#1976d2" },
];


const categories = [
  { label: "Engineering", value: 2 },
  { label: "Data Science", value: 1 },
  { label: "Business", value: 1 },
  { label: "Finance", value: 1 },
  { label: "Design", value: 1 },
  { label: "Product", value: 1 },
  { label: "Research", value: 1 },
];

export default function AnalyticsView() {
  return (
    <Box   sx={{ 
    backgroundColor: "#fff", 
    p: { xs: 2, sm: 3 }, 
  }} style={{backgroundColor: "#fff", width: "100%"}}>
      <Grid container spacing={3} mt={2}>
        <Stack
  direction={{ xs: "column", sm: "row" }}
  spacing={3}
  mt={2}
>
  {stats.map((item, idx) => (
    <Card key={idx} sx={{ flex: 1, borderRadius: 3, minWidth: { xs: "100%", sm: "200px", md: "250px", lg: "52%" }  }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ background: item.color }}>
            {item.icon}
          </Avatar>
          <Box>
            <Typography variant="body2">{item.title}</Typography>
            <Typography variant="h5" fontWeight="bold">
              {item.value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  ))}
</Stack>
      </Grid>

      {/* Category Bars */}

      <Box mt={5}>
                    <Paper
        elevation={3}
        sx={{
          mt: 5,
          p: 3,
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" mb={2} fontWeight="bold">
          Internships by Category
        </Typography>

        {categories.map((cat, idx) => (
          <Stack key={idx} direction="row" alignItems="center" spacing={2} mb={1}>
            <Typography sx={{ width: { xs: 90, sm: 130 }, fontSize: { xs: "0.8rem", sm: "1rem" } }}>{cat.label}</Typography>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress variant="determinate" value={cat.value * 50} />
            </Box>
            <Typography>{cat.value}</Typography>
          </Stack>
        ))}
        </Paper>
        {/* Internship Application Overview */}
<Box mt={6}>
  <Paper
        elevation={3}
        sx={{
          mt: 5,
          p: 3,
          borderRadius: 3,
        }}
      >
  <Typography variant="h6" fontWeight="bold" mb={2}>
    Internship Application Overview
  </Typography>
  <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: "auto" }}>
    <Table>
      <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
        <TableRow>
          <TableCell><b>Company</b></TableCell>
          <TableCell><b>Role</b></TableCell>
          <TableCell><b>Category</b></TableCell>
          <TableCell><b>Deadline</b></TableCell>
          <TableCell align="center"><b>Applications</b></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {[
          { company: "Google", role: "Software Engineering Intern", category: "Engineering", deadline: "12/15/2025", applications: 0 },
          { company: "Microsoft", role: "Data Science Intern", category: "Data Science", deadline: "11/30/2025", applications: 0 },
          { company: "Deloitte", role: "Business Consulting Intern", category: "Business", deadline: "12/20/2025", applications: 0 },
          { company: "Tesla", role: "Mechanical Engineering Intern", category: "Engineering", deadline: "11/25/2025", applications: 0 },
          { company: "Goldman Sachs", role: "Investment Banking Analyst Intern", category: "Finance", deadline: "12/10/2025", applications: 0 },
          { company: "Adobe", role: "UX Design Intern", category: "Design", deadline: "12/5/2025", applications: 0 },
          { company: "Amazon", role: "Product Management Intern", category: "Product", deadline: "11/28/2025", applications: 0 },
          { company: "Pfizer", role: "Biomedical Research Intern", category: "Research", deadline: "12/18/2025", applications: 0 },
        ].map((row, idx) => (
          <TableRow key={idx} hover>
            <TableCell>{row.company}</TableCell>
            <TableCell>{row.role}</TableCell>
            <TableCell>
              <Box
                sx={{
                  display: "inline-block",
                  px: 1.5,
                  py: 0.5,
                  backgroundColor: "#e3f2fd",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                }}
              >
                {row.category}
              </Box>
            </TableCell>
            <TableCell>{row.deadline}</TableCell>
            <TableCell align="center">{row.applications}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
  </Paper>
</Box>

<Box mt={6}>
    <Paper
        elevation={3}
        sx={{
          mt: 5,
          p: 3,
          borderRadius: 3,
        }}
      >
  <Typography   variant="h6" 
  fontWeight="bold" 
  mb={2} 
  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
    Most Applied Internships
  </Typography>

  <Stack spacing={2}>
    {[
      { company: "Google", role: "Software Engineering Intern", applications: 0 },
      { company: "Microsoft", role: "Data Science Intern", applications: 0 },
      { company: "Deloitte", role: "Business Consulting Intern", applications: 0 },
      { company: "Tesla", role: "Mechanical Engineering Intern", applications: 0 },
      { company: "Goldman Sachs", role: "Investment Banking Analyst Intern", applications: 0 },
    ].map((item, idx) => (
      <Card key={idx} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ backgroundColor: "#1976d2", color: "#fff" }}>
                {idx + 1}
              </Avatar>
              <Box>
                <Typography  variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  {item.role}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.company}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {item.applications} applications
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Stack>
  </Paper>
</Box>

      </Box>
    </Box>
  );
}