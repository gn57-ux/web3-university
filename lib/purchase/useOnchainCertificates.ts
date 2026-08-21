"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/useWallet";
import { useContractClients } from "@/lib/contracts/useContractClients";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { CourseCertificateAbi } from "@/lib/contracts/abis/CourseCertificate";
import { COURSE_ID_MAP } from "@/lib/contracts/courseIdMap";
import { mockCourses } from "@/lib/mock/fixtures";
import { toContractErrorMessage } from "@/lib/contracts/txError";

export interface OnchainCertificate {
  courseId: string;
  courseName: string;
  tokenId: string;
  completedAt: string;
  tokenURI: string;
  owner: `0x${string}`;
}

export interface OnchainCertificatesResult {
  certificates: OnchainCertificate[];
  /** 首次读取（或账户切换后的重新读取）尚未完成——语义与 useOnchainPurchases.ts
   *  的同名字段一致，同一套查询键方案（见下方 data/effective）。 */
  loading: boolean;
  error: string | null;
}

function courseNameForSlug(slug: string): string {
  return mockCourses.find((course) => course.id === slug)?.title ?? slug;
}

const KNOWN_COURSES = Object.entries(COURSE_ID_MAP).map(([slug, onchainCourseId]) => ({
  slug,
  onchainCourseId,
}));

/**
 * 个人中心"NFT 证书"Tab 用：对已知的 3 门种子课程逐一查询 `hasCertificate`，
 * 命中的再用 `CertificateMinted` 事件反查 tokenId（合约没有 `(courseId,
 * student) → tokenId` 的直接 getter，见 design.md 模块 3「架构决策」——本地
 * Anvil 演示链区块数极少，`getContractEvents` 全量查询在这个规模下可接受，
 * 生产环境需要改成按部署区块高度做 fromBlock 下限，不在本 feature 范围）。
 */
export function useOnchainCertificates(): OnchainCertificatesResult {
  const { address } = useWallet();
  const { publicClient } = useContractClients();
  // 与 useOnchainPurchases.ts 同一套"带查询键的合并状态"方案——loading 不能
  // 用初始 false + effect 里才置 true 的写法，否则首次渲染/账户切换后的第一帧
  // 会先展示"暂无证书"，被误判为"确实没有"（Codex Review 结构化复核在
  // Feature 15 里连续抓到过这个模式的问题，这里从一开始就按正确模式实现，不
  // 是先踩坑再修）。
  const [data, setData] = useState<{
    key: string;
    loading: boolean;
    certificates: OnchainCertificate[];
    error: string | null;
  }>({ key: "", loading: true, certificates: [], error: null });

  const queryKey = address ?? "anon";
  const effective =
    data.key === queryKey ? data : { loading: true, certificates: [], error: null };
  const { certificates, loading, error } = effective;

  const fetchCertificates = useCallback(
    async (studentAddress: string): Promise<OnchainCertificate[]> => {
      const addresses = CONTRACT_ADDRESSES[TARGET_CHAIN.id];
      const results = await Promise.all(
        KNOWN_COURSES.map(async ({ slug, onchainCourseId }) => {
          const has = await publicClient.readContract({
            address: addresses.CourseCertificate,
            abi: CourseCertificateAbi,
            functionName: "hasCertificate",
            args: [onchainCourseId, studentAddress as `0x${string}`],
          });
          if (!has) return null;

          const logs = await publicClient.getContractEvents({
            address: addresses.CourseCertificate,
            abi: CourseCertificateAbi,
            eventName: "CertificateMinted",
            args: { student: studentAddress as `0x${string}`, courseId: onchainCourseId },
            fromBlock: 0n,
            toBlock: "latest",
          });
          const tokenId = logs[0]?.args.tokenId;
          if (tokenId === undefined) return null;

          const [certData, uri, owner] = await Promise.all([
            publicClient.readContract({
              address: addresses.CourseCertificate,
              abi: CourseCertificateAbi,
              functionName: "certificateData",
              args: [tokenId],
            }),
            publicClient.readContract({
              address: addresses.CourseCertificate,
              abi: CourseCertificateAbi,
              functionName: "tokenURI",
              args: [tokenId],
            }),
            publicClient.readContract({
              address: addresses.CourseCertificate,
              abi: CourseCertificateAbi,
              functionName: "ownerOf",
              args: [tokenId],
            }),
          ]);
          const [, , completedAt] = certData;

          const certificate: OnchainCertificate = {
            courseId: slug,
            courseName: courseNameForSlug(slug),
            tokenId: tokenId.toString(),
            completedAt: new Date(Number(completedAt) * 1000).toISOString(),
            tokenURI: uri,
            owner,
          };
          return certificate;
        })
      );
      return results.filter((record): record is OnchainCertificate => record !== null);
    },
    [publicClient]
  );

  useEffect(() => {
    // cancelled 标志 + 带 key 的合并状态：与 useOnchainPurchases.ts 同一套
    // 账户切换竞态防护模式，理由不再重复展开。
    let cancelled = false;

    const key = address ?? "anon";

    if (!address) {
      queueMicrotask(() => {
        if (!cancelled) setData({ key, loading: false, certificates: [], error: null });
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setData({ key, loading: true, certificates: [], error: null });
    });

    fetchCertificates(address)
      .then((records) => {
        if (!cancelled) setData({ key, loading: false, certificates: records, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setData({ key, loading: false, certificates: [], error: toContractErrorMessage(e) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, fetchCertificates]);

  return { certificates, loading, error };
}
