/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { UnifiedHistogramInputMessage } from '../../../types';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { getLensVisMock } from '../../../__mocks__/lens_vis';
import { getLensProps, useLensProps } from './use_lens_props';

describe('useLensProps', () => {
  it('should return lens props', async () => {
    const getTimeRange = jest.fn();
    const fetch$ = new Subject<UnifiedHistogramInputMessage>();
    const onLoad = jest.fn();
    const query = {
      language: 'kuery',
      query: '',
    };
    const attributesContext = (
      await getLensVisMock({
        filters: [],
        query,
        columns: [],
        isPlainRecord: false,
        dataView: dataViewWithTimefieldMock,
        timeInterval: 'auto',
        breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
      })
    ).visContext;
    const lensProps = renderHook(() => {
      return useLensProps({
        request: {
          searchSessionId: 'id',
          adapter: undefined,
        },
        getTimeRange,
        fetch$,
        visContext: attributesContext!,
        onLoad,
      });
    });
    act(() => {
      fetch$.next({ type: 'fetch' });
    });
    expect(lensProps.result.current?.lensProps).toEqual(
      getLensProps({
        searchSessionId: 'id',
        getTimeRange,
        attributes: attributesContext!.attributes,
        onLoad,
      })
    );
  });

  it('should return lens props for text based languages', async () => {
    const getTimeRange = jest.fn();
    const fetch$ = new Subject<UnifiedHistogramInputMessage>();
    const onLoad = jest.fn();
    const query = {
      language: 'kuery',
      query: '',
    };
    const attributesContext = (
      await getLensVisMock({
        filters: [],
        query,
        columns: [],
        isPlainRecord: false,
        dataView: dataViewWithTimefieldMock,
        timeInterval: 'auto',
        breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
      })
    ).visContext;
    const lensProps = renderHook(() => {
      return useLensProps({
        request: {
          searchSessionId: 'id',
          adapter: undefined,
        },
        getTimeRange,
        fetch$,
        visContext: attributesContext!,
        onLoad,
      });
    });
    act(() => {
      fetch$.next({ type: 'fetch' });
    });
    expect(lensProps.result.current?.lensProps).toEqual(
      getLensProps({
        searchSessionId: 'id',
        getTimeRange,
        attributes: attributesContext!.attributes,
        onLoad,
      })
    );
  });

  it('should only return lens props after fetch$ is triggered', async () => {
    const getTimeRange = jest.fn();
    const fetch$ = new Subject<UnifiedHistogramInputMessage>();
    const onLoad = jest.fn();
    const query = {
      language: 'kuery',
      query: '',
    };
    const attributesContext = (
      await getLensVisMock({
        filters: [],
        query,
        columns: [],
        isPlainRecord: false,
        dataView: dataViewWithTimefieldMock,
        timeInterval: 'auto',
        breakdownField: dataViewWithTimefieldMock.getFieldByName('extension'),
      })
    ).visContext;
    const lensProps = {
      request: {
        searchSessionId: '123',
        adapter: undefined,
      },
      getTimeRange,
      fetch$,
      visContext: attributesContext!,
      onLoad,
    };
    const hook = renderHook(
      (props) => {
        return useLensProps(props);
      },
      { initialProps: lensProps }
    );
    expect(hook.result.current).toEqual(undefined);
    hook.rerender({ ...lensProps, request: { searchSessionId: '456', adapter: undefined } });
    expect(hook.result.current).toEqual(undefined);
    act(() => {
      fetch$.next({ type: 'fetch' });
    });
    expect(hook.result.current).not.toEqual(undefined);
  });
});
