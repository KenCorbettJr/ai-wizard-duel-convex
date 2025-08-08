"use client";

import { useState, useEffect } from 'react';

// Function to calculate the time difference and return a human-readable string
const timeAgo = (timestamp: number): string => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
};

interface TimeAgoProps {
  timestamp: number;
}

export const TimeAgo = ({ timestamp }: TimeAgoProps) => {
  const [time, setTime] = useState<string>(() => timeAgo(timestamp));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(timeAgo(timestamp));
    }, 1000); // Update every second

    return () => clearInterval(intervalId);
  }, [timestamp]);

  return <span>{time}</span>;
};
