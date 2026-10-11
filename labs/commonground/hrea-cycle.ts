// Copy into the pinned hREA checkout's clients/acceptance/src/ directory.
// Uses the upstream ephemeral harness; it does not connect to a Moss profile.
import { gql } from '@apollo/client/core';
import { strict as assert } from 'node:assert';
import { createHarness, teardownHarness } from './harness.js';

type Variables = Record<string, unknown>;
type Id = { id: string };
type Created<K extends string> = { res: Record<K, Id> };
type Resource = {
  id: string;
  accountingQuantity: { hasNumericalValue: number };
  onhandQuantity: { hasNumericalValue: number };
};
type EventResult = { res: { economicEvent: Id; economicResource: Resource | null } };

async function main() {
  console.log('CommonGround bread cycle: real hREA API, one Holochain signer, three economic actors.');
  console.log('Peer synchronisation, Moss integration and Unyt are separate manual checks.');
  const harness = await createHarness();
  const { client } = harness;
  let stage = 'setup';
  async function mutate<T>(document: string, variables: Variables): Promise<T> {
    const result = await client.mutate<T>({ mutation: gql(document), variables });
    assert(result.data, 'Mutation returned no data');
    return result.data;
  }
  async function organization(name: string): Promise<string> {
    const result = await mutate<Created<'agent'>>(
      'mutation ($v: AgentCreateParams!) { res: createOrganization(organization: $v) { agent { id } } }', { v: { name } });
    return result.res.agent.id;
  }
  async function unit(label: string, symbol: string, omUnitIdentifier: string): Promise<string> {
    const result = await mutate<Created<'unit'>>(
      'mutation ($v: UnitCreateParams!) { res: createUnit(unit: $v) { unit { id } } }', { v: { label, symbol, omUnitIdentifier } });
    return result.res.unit.id;
  }
  async function specification(name: string): Promise<string> {
    const result = await mutate<Created<'resourceSpecification'>>(
      'mutation ($v: ResourceSpecificationCreateParams!) { res: createResourceSpecification(resourceSpecification: $v) { resourceSpecification { id } } }', { v: { name } });
    return result.res.resourceSpecification.id;
  }
  async function event(e: Variables, r?: Variables): Promise<EventResult['res']> {
    const result = await mutate<EventResult>(`
      mutation ($e: EconomicEventCreateParams!, $r: EconomicResourceCreateParams) {
        res: createEconomicEvent(event: $e, newInventoriedResource: $r) {
          economicEvent { id }
          economicResource { id accountingQuantity { hasNumericalValue } onhandQuantity { hasNumericalValue } }
        }
      }`, { e: { hasPointInTime: new Date().toISOString(), ...e }, r });
    return result.res;
  }
  async function quantities(id: string, expected: number): Promise<void> {
    const result = await client.query<{ economicResource: Resource }>({
      query: gql`query ($id: ID!) { economicResource(id: $id) { id accountingQuantity { hasNumericalValue } onhandQuantity { hasNumericalValue } } }`,
      variables: { id }, fetchPolicy: 'no-cache',
    });
    const resource = result.data.economicResource;
    assert(resource, `Resource ${id} not found`);
    const accounting = Number(resource.accountingQuantity?.hasNumericalValue);
    const onhand = Number(resource.onhandQuantity?.hasNumericalValue);
    console.log(JSON.stringify({ stage, resource: id, expected, accounting, onhand }));
    assert.equal(accounting, expected, `Accounting quantity: expected ${expected}, received ${accounting}`);
    assert.equal(onhand, expected, `Onhand quantity: expected ${expected}, received ${onhand}`);
  }
  try {
    const bakery = await organization('CommonGround Lab — Пекарня');
    const cooperative = await organization('CommonGround Lab — Потребительский кооператив');
    const baker = (await mutate<Created<'agent'>>(
      'mutation ($v: AgentCreateParams!) { res: createPerson(person: $v) { agent { id } } }',
      { v: { name: 'CommonGround Lab — Пекарь' } })).res.agent.id;
    const kg = await unit('kilogram', 'kg', 'kilogram');
    const piece = await unit('piece', 'pc', 'one');
    const hour = await unit('hour', 'h', 'hour');
    const flourSpec = await specification('Мука');
    const breadSpec = await specification('Хлеб');
    const workSpec = await specification('Труд пекаря');

    stage = 'demand';
    const intent = (await mutate<Created<'intent'>>(
      'mutation ($v: IntentCreateParams!) { res: createIntent(intent: $v) { intent { id } } }',
      { v: { action: 'transfer', name: '10 буханок для кооператива', receiver: cooperative,
        resourceConformsTo: breadSpec, resourceQuantity: { hasNumericalValue: 10, hasUnit: piece } } })).res.intent.id;
    const plan = (await mutate<Created<'plan'>>(
      'mutation ($v: PlanCreateParams!) { res: createPlan(plan: $v) { plan { id } } }',
      { v: { name: 'CommonGround — хлебный цикл' } })).res.plan.id;
    const process = (await mutate<Created<'process'>>(
      'mutation ($v: ProcessCreateParams!) { res: createProcess(process: $v) { process { id } } }',
      { v: { name: 'Испечь 10 буханок', plannedWithin: plan } })).res.process.id;
    const commitment = (await mutate<Created<'commitment'>>(
      'mutation ($v: CommitmentCreateParams!) { res: createCommitment(commitment: $v) { commitment { id } } }',
      { v: { action: 'transfer', provider: bakery, receiver: cooperative, resourceConformsTo: breadSpec,
        resourceQuantity: { hasNumericalValue: 10, hasUnit: piece }, satisfies: intent,
        independentDemandOf: plan } })).res.commitment.id;

    console.log(JSON.stringify({ stage: 'demand linked', bakery, cooperative, baker, kg, piece, hour, intent, plan, process, commitment }));
    stage = 'opening inventory';
    // Opening inventory uses raise, not a fictitious flour-production process.
    const flour = (await event({ action: 'raise', provider: bakery, receiver: bakery,
      resourceConformsTo: flourSpec, resourceQuantity: { hasNumericalValue: 25, hasUnit: kg } },
      { name: 'Начальный остаток муки' })).economicResource;
    assert(flour?.id, 'Opening flour resource missing');
    await quantities(flour.id, 25);

    stage = 'consume flour';
    const consumed = await event({ action: 'consume', provider: bakery, receiver: bakery,
      resourceInventoriedAs: flour.id, resourceConformsTo: flourSpec,
      resourceQuantity: { hasNumericalValue: 5, hasUnit: kg }, inputOf: process });
    await quantities(flour.id, 20);

    stage = 'work';
    const worked = await event({ action: 'work', provider: baker, receiver: bakery,
      resourceConformsTo: workSpec, effortQuantity: { hasNumericalValue: 3, hasUnit: hour }, inputOf: process });
    const effort = await client.query<{ economicEvent: { effortQuantity: { hasNumericalValue: number; hasUnit: Id } } }>({
      query: gql`query ($id: ID!) { economicEvent(id: $id) { effortQuantity { hasNumericalValue hasUnit { id } } } }`,
      variables: { id: worked.economicEvent.id }, fetchPolicy: 'no-cache',
    });
    assert.equal(Number(effort.data.economicEvent.effortQuantity.hasNumericalValue), 3, 'Work must record three hours');
    assert.equal(effort.data.economicEvent.effortQuantity.hasUnit.id, hour, 'Work unit must be hours');
    console.log(JSON.stringify({ stage, event: worked.economicEvent.id, effort: effort.data.economicEvent.effortQuantity }));

    stage = 'produce bread';
    const produced = await event({ action: 'produce', provider: bakery, receiver: bakery,
      resourceConformsTo: breadSpec, resourceQuantity: { hasNumericalValue: 10, hasUnit: piece }, outputOf: process },
      { name: 'Партия хлеба в пекарне' });
    const bread = produced.economicResource;
    assert(bread?.id, 'Produced bread resource missing');
    await quantities(bread.id, 10);

    stage = 'process links';
    const flow = await client.query<{ process: { observedInputs: Id[]; observedOutputs: Id[] } }>({
      query: gql`query ($id: ID!) { process(id: $id) { observedInputs { id } observedOutputs { id } } }`,
      variables: { id: process }, fetchPolicy: 'no-cache',
    });
    assert(flow.data.process.observedInputs.some(e => e.id === consumed.economicEvent.id), 'Consumed flour not linked to process');
    assert(flow.data.process.observedInputs.some(e => e.id === worked.economicEvent.id), 'Work not linked to process');
    assert(flow.data.process.observedOutputs.some(e => e.id === produced.economicEvent.id), 'Bread not linked to process');
    console.log(JSON.stringify({ stage, process, ...flow.data.process }));

    stage = 'delivery';
    const destination = (await event({ action: 'raise', provider: cooperative, receiver: cooperative,
      resourceConformsTo: breadSpec, resourceQuantity: { hasNumericalValue: 0, hasUnit: piece } },
      { name: 'Хлеб в кооперативе — начальный остаток 0' })).economicResource;
    assert(destination?.id, 'Destination bread resource missing');
    const delivered = await event({ action: 'transfer', provider: bakery, receiver: cooperative,
      resourceInventoriedAs: bread.id, toResourceInventoriedAs: destination.id,
      resourceConformsTo: breadSpec, resourceQuantity: { hasNumericalValue: 10, hasUnit: piece },
      fulfills: [commitment], satisfies: [intent] });

    stage = 'fulfillment links';
    const fulfillment = await client.query<{ commitment: { fulfilledBy: Id[] } }>({
      query: gql`query ($id: ID!) { commitment(id: $id) { fulfilledBy { id } } }`,
      variables: { id: commitment }, fetchPolicy: 'no-cache',
    });
    assert(fulfillment.data.commitment.fulfilledBy.some(e => e.id === delivered.economicEvent.id), 'Delivery not linked to commitment');
    console.log(JSON.stringify({ stage, commitment, event: delivered.economicEvent.id, ...fulfillment.data.commitment }));

    stage = 'two-sided transfer accounting';
    // A recorded transfer is insufficient: both inventories must actually change.
    // Do not replace this with compensating raise/lower calls to make the test green.
    const checked = await Promise.allSettled([quantities(bread.id, 0), quantities(destination.id, 10)]);
    const failed = checked.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    assert.equal(failed.length, 0, failed.map(result => String(result.reason)).join('; '));
    console.log('CYCLE PASSED: flour=20 kg; bakery bread=0; cooperative bread=10; labor=3 h linked.');
  } catch (error) {
    console.error(`CYCLE FAILED at ${stage}:`, error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await teardownHarness(harness);
  }
  // The pinned upstream harness owns cleanup; force a final exit if a transport keeps a handle open.
  process.exit(process.exitCode ?? 0);
}

main().catch(error => {
  console.error('HARNESS FAILED:', error instanceof Error ? error.message : String(error));
  process.exit(2);
});
