import { renderHook } from '@testing-library/react-native';
import { useNextClass } from '../../src/hooks/useNextClass';

it('covers useNextClass default-arg branch', () => {
  const { result } = renderHook(() => useNextClass());
  expect(result.current.nextClass).toBeNull();
  expect(result.current.isLoading).toBe(false);
});
