import ExtendedError from 'extended_err';

import { SharedState } from '../SharedState';

import { LazyGetFunction } from '../types';

type LazyArrayState<D> = {
  data: D[];
  page: number;
  pageEnd: boolean;
  isError: ExtendedError;
  isLoading: boolean;
};

export class SharedLazyArray<D> extends SharedState<LazyArrayState<D>> {
  constructor() {
    super({
      data: [],
      page: 0,
      pageEnd: false,
      isError: null,
      isLoading: false,
    });
  }

  get data() {
    return this.state.data;
  }

  async lazyGet(lazyGetFunction: LazyGetFunction<D>) {
    const { data, page, pageEnd } = this.state;

    if (!pageEnd) {
      this.setState({ isLoading: true });

      try {
        const newData = await Promise.resolve(lazyGetFunction(page));

        if (newData.length) {
          this.setState({
            data: [...data, ...newData],
            page: page + 1,
            isLoading: false,
          });
        } else {
          this.setState({
            pageEnd: true,
            isLoading: false,
          });
        }

        return newData;
      } catch (error) {
        this.setState({
          isError: new ExtendedError({
            name: 'State Error',
            code: 'LAZY_GET_ERROR',
            message: 'Error lazy getting data',
            severity: 'HIGH',
            info: { ...this.state },
          }),
          isLoading: false,
        });
      }
    }

    return null;
  }

  useArray() {
    const [state] = super.useState([
      'data',
      'isError',
      'isLoading',
      'page',
      'pageEnd',
    ]);

    return state;
  }
}
