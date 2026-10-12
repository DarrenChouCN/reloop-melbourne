<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import items from '../data/reuse-guide.json'

const categories = [...new Set(items.map((item) => item.category))]
const searchForm = reactive({ keyword: '', category: 'Small Appliances' })
const keyword = ref('')
const category = ref('Small Appliances')

const results = computed(() => {
  return items.filter((item) => {
    const matchesCategory = !category.value || item.category === category.value
    const matchesKeyword = `${item.name} ${item.description}`.toLowerCase().includes(keyword.value)
    return matchesCategory && matchesKeyword
  })
})

function searchGuide() {
  keyword.value = searchForm.keyword.trim().toLowerCase()
  category.value = searchForm.category
}

function selectCategory(value) {
  searchForm.keyword = ''
  searchForm.category = value
  searchGuide()
}
</script>

<template>
  <div class="guide-page page-container">
    <header class="page-heading">
      <h1>Reuse &amp; Recycling Guide</h1>
      <p>Find a practical option for common unwanted household items.</p>
    </header>

    <form class="guide-search form-fields" @submit.prevent="searchGuide">
      <label>
        What item do you have?
        <input
          v-model="searchForm.keyword"
          type="search"
          placeholder="e.g. toaster, clothing or chair"
        />
      </label>
      <label>
        Category
        <select v-model="searchForm.category">
          <option value="">All categories</option>
          <option v-for="value in categories" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
      <button class="button" type="submit">Search Guide</button>
    </form>

    <div class="guide-layout">
      <aside aria-labelledby="categories-heading">
        <h2 id="categories-heading">Browse Categories</h2>
        <nav class="category-list" aria-label="Guide categories">
          <button
            v-for="value in ['', ...categories]"
            :key="value"
            class="category-button"
            type="button"
            :aria-pressed="category === value"
            @click="selectCategory(value)"
          >
            {{ value || 'All categories' }}
          </button>
        </nav>
      </aside>

      <section aria-labelledby="results-heading">
        <div class="results-heading">
          <h2 id="results-heading">{{ category || 'All Categories' }}</h2>
          <span class="muted" role="status"
            >{{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}</span
          >
        </div>
        <p v-if="!results.length" class="muted">No items found. Try another keyword or category.</p>
        <article v-for="item in results" :key="item.id" class="guide-item">
          <div class="item-image" aria-hidden="true">Item</div>
          <div>
            <h3>{{ item.name }}</h3>
            <p>{{ item.description }}</p>
            <div class="item-actions">
              <ol class="steps" aria-label="Suggested order">
                <li v-for="(step, index) in item.steps" :key="step">{{ index + 1 }}. {{ step }}</li>
              </ol>
              <RouterLink to="/services"
                >View local options<span class="visually-hidden">
                  for {{ item.name }}</span
                ></RouterLink
              >
            </div>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.guide-page {
  line-height: 1.5;
}
.guide-search {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  align-items: end;
  gap: 24px;
  padding: 24px 0;
  border-bottom: 1px solid #ddd;
}
.guide-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 28px;
  margin-top: 24px;
}
h2,
h3 {
  margin: 0;
  font-weight: 500;
  font-size: 24px;
}
.category-list {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}
.category-button {
  padding: 14px 8px;
  border: 0;
  border-bottom: 1px solid #ddd;
  background: white;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.category-button[aria-pressed='true'] {
  text-decoration: underline;
}
.results-heading,
.item-actions,
.steps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.results-heading,
.item-actions {
  justify-content: space-between;
}
.guide-item {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 24px;
  padding: 20px 0;
  border-top: 1px solid #ddd;
}
.item-image {
  height: 100px;
  display: grid;
  place-items: center;
  background: #e4e4e4;
  color: #666;
}
.guide-item p {
  margin: 8px 0 20px;
}
.steps {
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
}
@media (max-width: 767px) {
  .guide-search,
  .guide-layout {
    grid-template-columns: 1fr;
  }
  .guide-item {
    grid-template-columns: 70px minmax(0, 1fr);
    gap: 16px;
  }
  .item-image {
    height: 70px;
  }
}
</style>
