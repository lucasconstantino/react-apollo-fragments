var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import * as React from 'react';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider } from './';
import { mockSingleLink } from './test-links';
export * from './test-links';
var MockedProvider = (function (_super) {
    __extends(MockedProvider, _super);
    function MockedProvider(props, context) {
        var _this = _super.call(this, props, context) || this;
        if (_this.props.client)
            return _this;
        var addTypename = !_this.props.removeTypename;
        var link = mockSingleLink.apply(null, _this.props.mocks);
        _this.client = new ApolloClient({
            link: link,
            cache: new Cache({ addTypename: addTypename }),
            defaultOptions: _this.props.defaultOptions,
        });
        return _this;
    }
    MockedProvider.prototype.render = function () {
        return (React.createElement(ApolloProvider, { client: this.client || this.props.client }, this.props.children));
    };
    return MockedProvider;
}(React.Component));
export { MockedProvider };
//# sourceMappingURL=test-utils.js.map