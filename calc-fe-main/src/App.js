import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import Home from '@/screens/home';
import '@/index.css';
const paths = [
    {
        path: '/',
        element: (_jsx(Home, {})),
    },
];
const BrowserRouter = createBrowserRouter(paths);
const App = () => {
    return (_jsx(MantineProvider, { children: _jsx(RouterProvider, { router: BrowserRouter }) }));
};
export default App;
