#include <stdio.h>
int main() { int A = 12, B = 10; unsigned U = 0xF0F0F0F0u; printf("%d %d %d %d %d %d\n", A & B, A | B, A ^ B, ~A, A << 3, A >> 2); printf("%d %d\n", -16 >> 2, -1 >> 31); printf("%u %u %x %x\n", U >> 4, U << 4, ~U, U & 0xFF); printf("%d %d\n", 1 << 30, (1 << 30) + ((1 << 30) - 1)); printf("%lx\n", 1UL << 63); return 0; }
