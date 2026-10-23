import {it,expect} from 'vitest';
import type {StylePropertySpecification} from '@maplibre/maplibre-gl-style-spec';
import {createPropertyExpression,latest} from '@maplibre/maplibre-gl-style-spec';
import {STREET_SIDE_OFFSET,streetSideWidth} from '../../src/lib/map/street-side-paint';
it('MapLibre accepts zoom/side paint and keeps wider click targets separated',()=>{
 const offset=createPropertyExpression(STREET_SIDE_OFFSET,'line-offset',latest.paint_line['line-offset'] as StylePropertySpecification);
 const width=createPropertyExpression(streetSideWidth(13),'line-width',latest.paint_line['line-width'] as StylePropertySpecification);
 expect(offset.result).toBe('success');expect(width.result).toBe('success');if(offset.result!=='success'||width.result!=='success')return;
 const left={type:'LineString' as const,properties:{side:'left'}},right={type:'LineString' as const,properties:{side:'right'}};
 const near=offset.value.evaluate({zoom:16},right),close=offset.value.evaluate({zoom:18},right);
 expect(near).toBe(6);expect(close).toBeGreaterThan(near*2);expect(offset.value.evaluate({zoom:18},left)).toBe(-close);
 expect(width.value.evaluate({zoom:18})).toBeGreaterThan(width.value.evaluate({zoom:16}));expect(close*2).toBeGreaterThan(width.value.evaluate({zoom:18}));
});
