import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Menu,
  MenuItem,
  ListItemIcon, ListItemText
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LogoutIcon from '@mui/icons-material/Logout';

export default function NavBar({ username, onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  return (
    <AppBar position="static">
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6">Admin Dashboard</Typography>

        <Box display="flex" alignItems="center" gap={2}>
          <Box
            onClick={handleClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            <Typography>{username}</Typography>
            <KeyboardArrowDownIcon
              sx={{
                ml: 0.5,
                transition: 'transform 0.2s',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
             PaperProps={{sx: {width: 150 }}}
          >
            {/* <MenuItem onClick={handleLogout}>Logout</MenuItem> */}
            <MenuItem onClick={handleLogout}>
                 <ListItemIcon>
                       <LogoutIcon fontSize="small" />
                 </ListItemIcon>
                 <ListItemText>Logout</ListItemText>
</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
