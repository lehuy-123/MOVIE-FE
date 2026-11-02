'use client';

import React, { useMemo } from 'react';
import { SeatMesh } from './SeatMesh';
import { SeatData } from '@/types/cinema';

interface SeatGridProps {
  selectedSeatId: string | null;
  onSelectSeat: (seat: SeatData) => void;
  occupiedSeats?: Record<string, string>; // seatId -> username
}

export function SeatGrid({
  selectedSeatId,
  onSelectSeat,
  occupiedSeats = {},
}: SeatGridProps) {
  // 4 rows (A..D) and 6 columns (1..6) configured for giant IMAX room
  const rows = ['A', 'B', 'C', 'D'];
  const rowZPositions = [2.5, 5.8, 9.1, 12.4]; // matches tiered stadium floors
  const rowYPositions = [0.5, 0.9, 1.3, 1.7];
  const colXPositions = [-6.2, -3.7, -1.2, 1.2, 3.7, 6.2]; // 3 on left, 3 on right with aisle

  const seats: SeatData[] = useMemo(() => {
    const list: SeatData[] = [];
    rows.forEach((rowLetter, rowIndex) => {
      colXPositions.forEach((x, colIndex) => {
        const id = `${rowLetter}${colIndex + 1}`;
        const isOccupied = id in occupiedSeats;
        const isSelected = id === selectedSeatId;

        list.push({
          id,
          row: rowIndex,
          col: colIndex,
          position: [x, rowYPositions[rowIndex], rowZPositions[rowIndex]],
          state: isSelected ? 'selected' : isOccupied ? 'occupied' : 'empty',
          occupiedBy: occupiedSeats[id],
        });
      });
    });
    return list;
  }, [selectedSeatId, occupiedSeats]);

  return (
    <group name="seat-grid">
      {seats.map((seat) => (
        <SeatMesh
          key={seat.id}
          seat={seat}
          isSelected={seat.id === selectedSeatId}
          onSelect={onSelectSeat}
        />
      ))}
    </group>
  );
}
