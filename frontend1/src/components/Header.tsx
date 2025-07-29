import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { Brightness4, Brightness7, Logout } from '@mui/icons-material';
import { ThemeContext } from '../main';

const Header: React.FC = () => {
  const { toggleTheme, mode } = React.useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); // Clear all localStorage
    navigate('/login', { replace: true }); // Navigate to login
    window.location.reload(); // Force page reload
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      p: 2, 
      bgcolor: mode === 'light' ? '#1e293b' : '#0f172a',
      color: '#e2e8f0',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      borderBottom: '1px solid #475569'
    }}>
      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#e2e8f0' }}>
        MyMoneyMagnet
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton 
          onClick={toggleTheme} 
          sx={{ color: '#e2e8f0' }}
        >
          {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
        <Button
          variant="outlined"
          sx={{ 
            color: '#e2e8f0', 
            borderColor: '#64748b',
            borderRadius: 6,
            '&:hover': { 
              bgcolor: mode === 'light' ? '#475569' : '#334155',
              borderColor: '#94a3b8',
            }
          }}
          startIcon={<Logout />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default Header;