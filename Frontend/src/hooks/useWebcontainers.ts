import { WebContainer } from '@webcontainer/api';
import { useEffect, useState } from 'react';


export default function useWebcontainers(){

    const [webcontainer,setwebcontainer] = useState<WebContainer>()

    async function main(){
    const webcontainerInstance = await WebContainer.boot();
     setwebcontainer(webcontainerInstance)
    }
    useEffect(() => {
        main()
    }, [])
    return webcontainer
}