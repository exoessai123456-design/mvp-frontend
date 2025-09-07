import React, { useState } from 'react';
import { Button, Menu, MenuItem, Dialog, DialogTitle, DialogActions, TextField } from '@mui/material';
import { saveAs } from 'file-saver';
import { Parser } from 'json2csv';
import dayjs from 'dayjs';

export default function ExportEvents({ events }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const exportCSV = (filteredEvents, filename) => {
    const parser = new Parser();
    const csv = parser.parse(filteredEvents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
  };

  const handleExport = (range) => {
    closeMenu();

    let from, to;
    const now = dayjs();
    if (range === 'today') {
      from = now.startOf('day');
      to = now.endOf('day');
    } else if (range === 'week') {
      from = now.startOf('week');
      to = now.endOf('week');
    } else if (range === 'month') {
      from = now.startOf('month');
      to = now.endOf('month');
    } else {
      setCustomDialogOpen(true);
      return;
    }

    const filtered = events.filter(e =>
      dayjs(e.start).isAfter(from) && dayjs(e.start).isBefore(to)
    );

    exportCSV(filtered, `events_${range}_${now.format('YYYY-MM-DD')}.csv`);
  };

  const handleCustomExport = () => {
    const from = dayjs(customRange.from);
    const to = dayjs(customRange.to);

    const filtered = events.filter(e =>
      dayjs(e.start).isAfter(from) && dayjs(e.start).isBefore(to)
    );

    exportCSV(filtered, `events_custom_${dayjs().format('YYYY-MM-DD')}.csv`);
    setCustomDialogOpen(false);
  };

  return (
    <>
      <Button variant="outlined" onClick={openMenu}>Export Events</Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MenuItem onClick={() => handleExport('today')}>Today</MenuItem>
        <MenuItem onClick={() => handleExport('week')}>This Week</MenuItem>
        <MenuItem onClick={() => handleExport('month')}>This Month</MenuItem>
        <MenuItem onClick={() => handleExport('custom')}>Custom Range</MenuItem>
      </Menu>

      <Dialog open={customDialogOpen} onClose={() => setCustomDialogOpen(false)}>
        <DialogTitle>Custom Date Range</DialogTitle>
        <TextField
          type="date"
          label="From"
          fullWidth
          value={customRange.from}
          onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
          sx={{ m: 2 }}
        />
        <TextField
          type="date"
          label="To"
          fullWidth
          value={customRange.to}
          onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
          sx={{ m: 2 }}
        />
        <DialogActions>
          <Button onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCustomExport} disabled={!customRange.from || !customRange.to}>Export</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
