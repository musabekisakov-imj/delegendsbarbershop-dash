import type { AppointmentWithDetails } from '../types';

export interface LaneInfo {
  lane: number;
  laneCount: number;
}

export function assignLanes(appts: AppointmentWithDetails[]): Map<string, LaneInfo> {
  const sorted = [...appts].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const result = new Map<string, LaneInfo>();

  let group: AppointmentWithDetails[] = [];
  let groupEnd = 0;

  const flush = () => {
    if (group.length === 0) return;
    const laneEnds: number[] = [];
    const laneByApt = new Map<string, number>();
    for (const apt of group) {
      const start = new Date(apt.startTime).getTime();
      const end = new Date(apt.endTime).getTime();
      let lane = laneEnds.findIndex(e => e <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      laneByApt.set(apt.id, lane);
    }
    const laneCount = laneEnds.length;
    for (const apt of group) {
      result.set(apt.id, { lane: laneByApt.get(apt.id)!, laneCount });
    }
    group = [];
    groupEnd = 0;
  };

  for (const apt of sorted) {
    const start = new Date(apt.startTime).getTime();
    const end = new Date(apt.endTime).getTime();
    if (group.length === 0 || start < groupEnd) {
      group.push(apt);
      groupEnd = Math.max(groupEnd, end);
    } else {
      flush();
      group.push(apt);
      groupEnd = end;
    }
  }
  flush();

  return result;
}
