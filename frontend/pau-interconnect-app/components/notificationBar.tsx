import { useState } from "react";
import { IconButton, Slide, SlideProps } from "@mui/material";
import { GiSparkles } from "react-icons/gi";
import { AiOutlineClose } from "react-icons/ai";

interface NotificationBarProps {
  count: number;
  onDismiss: () => void;
}

// Slide transition function for MUI
const SlideDown = (props: SlideProps) => {
  return <Slide {...props} direction="down" />;
};

const NotificationBar = ({ count, onDismiss }: NotificationBarProps) => {
  const [open, setOpen] = useState(count > 0);

  const handleClose = () => {
    setOpen(false);
    onDismiss();
  };

  if (count === 0) return null;

  return (
    <SlideDown in={open} mountOnEnter unmountOnExit>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          background: "linear-gradient(to right, #4f46e5, #6366f1)",
          color: "white",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          zIndex: 1300,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GiSparkles size={20} />
          <span>
            {count} new internship{count > 1 ? "s" : ""} added! Check them out
            below.
          </span>
        </div>
        <IconButton
          aria-label="close"
          color="inherit"
          size="small"
          onClick={handleClose}
          sx={{ color: "white" }}
        >
          <AiOutlineClose size={18} />
        </IconButton>
      </div>
    </SlideDown>
  );
};

export default NotificationBar;
