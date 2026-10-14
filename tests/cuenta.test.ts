import { describe, expect, it } from 'vitest';
import { diferencia, fusionarConcurrente, hayCambios, mensajeDeError, mismoConjunto } from '../src/lib/cuenta';

describe('diferencia', () => {
  it('sin base manda todo lo local como altas, sin repetir', () => {
    expect(diferencia(['a', 'b', 'a'], null)).toEqual({ add: ['a', 'b'], remove: [] });
  });

  it('con base manda solo lo que cambió', () => {
    expect(diferencia(['a', 'c'], ['a', 'b'])).toEqual({ add: ['c'], remove: ['b'] });
  });

  it('sin cambios no hay nada que enviar', () => {
    expect(hayCambios(diferencia(['a', 'b'], ['b', 'a']))).toBe(false);
    expect(hayCambios(diferencia([], null))).toBe(false);
  });
});

describe('fusionarConcurrente', () => {
  it('sin cambios mientras viajaba, gana el servidor', () => {
    expect(fusionarConcurrente(['a', 'b'], ['a'], ['a']).sort()).toEqual(['a', 'b']);
  });

  it('conserva lo marcado mientras viajaba la petición', () => {
    expect(fusionarConcurrente(['a'], ['a'], ['a', 'nuevo']).sort()).toEqual(['a', 'nuevo']);
  });

  it('respeta lo quitado mientras viajaba la petición', () => {
    expect(fusionarConcurrente(['a', 'b'], ['a', 'b'], ['a'])).toEqual(['a']);
  });

  it('suma lo que trajo el servidor de otros dispositivos', () => {
    expect(fusionarConcurrente(['a', 'remoto'], ['a'], ['a']).sort()).toEqual(['a', 'remoto']);
  });
});

describe('mismoConjunto', () => {
  it('compara sin importar el orden', () => {
    expect(mismoConjunto(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(mismoConjunto(['a'], ['a', 'b'])).toBe(false);
  });
});

describe('mensajeDeError', () => {
  it('traduce códigos conocidos y cae en un mensaje genérico', () => {
    expect(mensajeDeError('credenciales')).toMatch(/incorrectos/);
    expect(mensajeDeError('algo_raro')).toBe(mensajeDeError(undefined));
  });

  it('no usa rayas largas', () => {
    for (const codigo of ['invalid', 'codigo', 'github_fallo', 'sin_clave', 'error']) {
      expect(mensajeDeError(codigo)).not.toMatch(/—/);
    }
  });
});
