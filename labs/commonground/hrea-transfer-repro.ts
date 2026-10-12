// Copy beside the pinned upstream acceptance harness. No compensating events.
import { gql } from '@apollo/client/core';
import { strict as assert } from 'node:assert';
import { createHarness, teardownHarness } from './harness.js';

async function main() {
  const harness = await createHarness();
  const { client } = harness;
  async function mutation(document: string, variables: Record<string, unknown>) {
    const result = await client.mutate({ mutation: gql(document), variables });
    assert(result.data, 'Mutation returned no data');
    return result.data;
  }
  async function organization(name: string) {
    const result = await mutation(`mutation ($v: AgentCreateParams!) {
      createOrganization(organization: $v) { agent { id } }
    }`, { v: { name } });
    return result.createOrganization.agent.id;
  }
  async function event(e: Record<string, unknown>, r?: Record<string, unknown>) {
    const result = await mutation(`mutation ($e: EconomicEventCreateParams!, $r: EconomicResourceCreateParams) {
      createEconomicEvent(event: $e, newInventoriedResource: $r) {
        economicEvent { id }
        economicResource { id }
      }
    }`, { e: { hasPointInTime: new Date().toISOString(), ...e }, r });
    return result.createEconomicEvent;
  }
  async function read(id: string) {
    const result = await client.query({ query: gql`query ($id: ID!) {
      economicResource(id: $id) {
        id accountingQuantity { hasNumericalValue } onhandQuantity { hasNumericalValue }
      }
    }`, variables: { id }, fetchPolicy: 'no-cache' });
    return result.data.economicResource;
  }
  try {
    const sender = await organization('CommonGround transfer repro — bakery');
    const receiver = await organization('CommonGround transfer repro — cooperative');
    const unit = (await mutation(`mutation ($v: UnitCreateParams!) {
      createUnit(unit: $v) { unit { id } }
    }`, { v: { label: 'piece', symbol: 'pc', omUnitIdentifier: 'one' } })).createUnit.unit.id;
    const spec = (await mutation(`mutation ($v: ResourceSpecificationCreateParams!) {
      createResourceSpecification(resourceSpecification: $v) { resourceSpecification { id } }
    }`, { v: { name: 'Bread — transfer repro' } })).createResourceSpecification.resourceSpecification.id;
    const source = (await event({ action: 'produce', provider: sender, receiver: sender,
      resourceConformsTo: spec, resourceQuantity: { hasNumericalValue: 10, hasUnit: unit } },
      { name: 'Bread at bakery' })).economicResource.id;
    // Initialise a genuinely empty destination; this event does not credit delivery.
    const destination = (await event({ action: 'raise', provider: receiver, receiver,
      resourceConformsTo: spec, resourceQuantity: { hasNumericalValue: 0, hasUnit: unit } },
      { name: 'Empty cooperative inventory' })).economicResource.id;
    const before = await Promise.all([read(source), read(destination)]);
    console.log(JSON.stringify({ stage: 'before transfer', resources: before }));
    const transferred = await event({ action: 'transfer', provider: sender, receiver,
      resourceConformsTo: spec, resourceInventoriedAs: source, toResourceInventoriedAs: destination,
      resourceQuantity: { hasNumericalValue: 10, hasUnit: unit } });
    const after = await Promise.all([read(source), read(destination)]);
    console.log(JSON.stringify({ stage: 'after transfer', event: transferred.economicEvent.id, resources: after }));
    const quantities = (resources: typeof after) => resources.map(r => [
      Number(r.accountingQuantity?.hasNumericalValue), Number(r.onhandQuantity?.hasNumericalValue),
    ]);
    assert.deepEqual(quantities(before), [[10, 10], [0, 0]], 'Opening inventories');
    assert.deepEqual(quantities(after), [[0, 0], [10, 10]], 'Transfer must update both inventories');
    console.log('TRANSFER REPRO PASSED');
  } catch (error) {
    console.error('TRANSFER REPRO FAILED:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await teardownHarness(harness);
  }
  process.exit(process.exitCode ?? 0);
}

main().catch(error => { console.error('HARNESS FAILED:', String(error)); process.exit(2); });
