import { useState, useCallback } from 'react';

/** 管理指针锁定状态（进入/暂停漫步） */
export default function usePointerLock() {
  const [locked, setLocked] = useState(false);
  const onLockChange = useCallback(v => setLocked(v), []);
  return { locked, onLockChange };
}
