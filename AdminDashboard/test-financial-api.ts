import { financialService } from './services/financial.service'

async function test() {
    try {
        console.log('Testing financial dashboard API...')
        const data = await financialService.getDashboard()
        console.log('Raw response:', data)
        console.log('Type:', typeof data)
        console.log('Keys:', Object.keys(data))
        console.log('total_revenue:', data.total_revenue)
        console.log('cash_revenue:', data.cash_revenue)
    } catch (error) {
        console.error('Error:', error)
    }
}

test()
