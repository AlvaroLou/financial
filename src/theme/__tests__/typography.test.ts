import { describe, expect, it } from 'vitest';

import { fonts } from '@/theme/tokens';
import { systemFontStyle, usesSystemFont } from '@/theme/typography';

describe('fonte do sistema para chinês, japonês e coreano', () => {
  it('só vale para zh, ja e ko', () => {
    expect(['zh-CN', 'ja', 'ko', 'zh', 'ko-KR'].map(usesSystemFont)).toEqual([true, true, true, true, true]);
    expect(['pt-BR', 'en', 'de', 'ru', 'jav', undefined, null, ''].map(usesSystemFont)).toEqual(
      [false, false, false, false, false, false, false, false],
    );
  });

  it('troca a Inter pela fonte do sistema mantendo o peso', () => {
    expect(systemFontStyle({ fontFamily: fonts.bold }, 'System')).toEqual({ fontFamily: 'System', fontWeight: '700' });
    expect(systemFontStyle({ fontFamily: fonts.semibold }, 'sans-serif')).toEqual({ fontFamily: 'sans-serif', fontWeight: '600' });
    expect(systemFontStyle({ fontFamily: fonts.medium }, 'System')?.fontWeight).toBe('500');
    expect(systemFontStyle({ fontFamily: fonts.regular }, 'System')?.fontWeight).toBe('400');
  });

  it('zera só o espaçamento negativo e ignora estilos sem Inter', () => {
    expect(systemFontStyle({ fontFamily: fonts.bold, letterSpacing: -1 }, 'System')).toEqual({
      fontFamily: 'System',
      fontWeight: '700',
      letterSpacing: 0,
    });
    expect(systemFontStyle({ fontFamily: fonts.semibold, letterSpacing: 0.8 }, 'System')).not.toHaveProperty('letterSpacing');
    expect(systemFontStyle({ fontFamily: 'Menlo' }, 'System')).toBeNull();
    expect(systemFontStyle({}, 'System')).toBeNull();
  });
});
