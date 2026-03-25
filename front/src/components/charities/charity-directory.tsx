"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Charity } from "@/lib/types";

export function CharityDirectory({
  charities,
}: {
  charities: Charity[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [country, setCountry] = useState("all");

  const categories = Array.from(new Set(charities.map((charity) => charity.category))).sort();
  const countries = Array.from(new Set(charities.map((charity) => charity.countryCode))).sort();
  const filtered = charities.filter((charity) => {
    const matchesSearch =
      !search ||
      `${charity.name} ${charity.shortDescription} ${charity.description}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesCategory = category === "all" || charity.category === category;
    const matchesCountry = country === "all" || charity.countryCode === country;

    return matchesSearch && matchesCategory && matchesCountry;
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.6fr]">
          <label className="field">
            <span>Search charities</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, mission, or impact"
                className="input pl-11"
              />
            </div>
          </label>

          <label className="field">
            <span>Filter by category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="select"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Country</span>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="select"
            >
              <option value="all">All countries</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="grid-auto">
        {filtered.map((charity) => (
          <Link key={charity.id} href={`/charities/${charity.slug}`} className="block">
            <Card className="overflow-hidden transition duration-200 hover:-translate-y-1">
              <img
                src={charity.imageUrl}
                alt={charity.name}
                className="h-56 w-full object-cover"
              />
              <div className="space-y-4 p-6">
                <div className="split">
                  <div className="cluster">
                    <Badge tone={charity.featured ? "accent" : "secondary"}>
                      {charity.category}
                    </Badge>
                    <span className="pill">{charity.countryCode}</span>
                  </div>
                  <span className="pill">${(charity.raisedTotal ?? 0).toFixed(2)} raised</span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{charity.name}</h2>
                  <p className="mt-2 muted">{charity.shortDescription}</p>
                </div>
                <p className="text-sm leading-7 text-slate-300">{charity.description}</p>
                <div className="split text-sm text-slate-300">
                  <span>{charity.upcomingEvent}</span>
                  <span>{charity.subscriberCount ?? 0} supporters</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!filtered.length ? (
        <Card className="p-6">
          <p className="muted">No charities matched your search. Try a wider keyword or category.</p>
        </Card>
      ) : null}
    </div>
  );
}
