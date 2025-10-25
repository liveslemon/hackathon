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
    <Box p={3} style={{backgroundColor: "#fff"}}>
      <Grid container spacing={3} mt={2}>
        <Stack
  direction={{ xs: "column", sm: "row" }}
  spacing={3}
  mt={2}
>
  {stats.map((item, idx) => (
    <Card key={idx} sx={{ flex: 1, borderRadius: 3 }}>
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
        <Typography variant="h6" mb={2} fontWeight="bold">
          Internships by Category
        </Typography>

        {categories.map((cat, idx) => (
          <Stack key={idx} direction="row" alignItems="center" spacing={2} mb={1}>
            <Typography sx={{ width: 130 }}>{cat.label}</Typography>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress variant="determinate" value={cat.value * 50} />
            </Box>
            <Typography>{cat.value}</Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}